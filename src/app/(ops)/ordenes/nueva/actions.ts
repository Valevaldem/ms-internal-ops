"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function convertToOrderAction(formData: FormData) {
  const qid = formData.get("quotationId") as string;
  const deliveryMethod = formData.get("deliveryMethod") as string;
  const posTicket = formData.get("posTicketNumber") as string;
  const orderNotes = formData.get("orderNotes") as string;

  const isCertificatePending = formData.get("isCertificatePending") === "on";
  const certificateTitle = formData.get("certificateTitle") as string;

  if (!qid || !deliveryMethod) {
    return { error: "Faltan datos obligatorios." };
  }

  // extract certificate members
  const members = [];
  let index = 0;
  while (formData.has(`stoneId_${index}`)) {
    const stoneId = formData.get(`stoneId_${index}`) as string;
    const lotCode = formData.get(`stoneLot_${index}`) as string;
    const memberName = formData.get(`member_${index}`) as string;
    const helperDescription = formData.get(`helper_${index}`) as string;

    if (!isCertificatePending && (!memberName || memberName.trim() === "")) {
       return { error: `Falta el nombre del miembro para la piedra ${lotCode}` };
    }

    if (memberName?.trim()) {
        members.push({
            memberName: memberName.trim(),
            representativeStone: lotCode,
            helperDescription: helperDescription?.trim() || null
        });
    }

    index++;
  }

  if (!isCertificatePending && (!certificateTitle || certificateTitle.trim() === "")) {
      return { error: "Falta el título del certificado." };
  }

  try {
    await prisma.$transaction([
      prisma.order.create({
        data: {
          quotationId: qid,
          deliveryMethod,
          posTicketNumber: posTicket,
          orderNotes: orderNotes || null,
          isCertificatePending,
          certificateTitle: certificateTitle || null,
          stage: "Por confirmar diseño final",
          certificateMembers: {
              create: members
          },
          stageHistory: {
              create: [
                { stage: "Convertida a orden" },
                { stage: "Por confirmar diseño final" }
              ]
          }
        }
      }),
      prisma.quotation.update({
        where: { id: qid },
        data: { status: "Converted" }
      })
    ]);

  } catch (err: any) {
     console.error("Error creating order", err);
     return { error: "Ocurrió un error al guardar en la base de datos." };
  }

  revalidatePath("/cotizaciones/historial");
  revalidatePath("/ordenes/produccion");
  redirect("/ordenes/produccion");
}
