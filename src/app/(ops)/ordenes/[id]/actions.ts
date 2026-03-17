"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateCertificateAction(orderId: string, formData: FormData) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { stage: true }
  });

  if (!order || order.stage !== "Producción") {
      return { error: "No se puede editar el certificado en esta etapa." };
  }

  const isCertificatePending = formData.get("isCertificatePending") === "on";
  const certificateTitle = formData.get("certificateTitle") as string;

  // Extract certificate members
  const members: Array<{ memberName: string, representativeStone: string, helperDescription: string | null }> = [];
  let index = 0;
  while (formData.has(`stoneLot_${index}`)) {
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
    await prisma.$transaction(async (tx) => {
      // Delete existing certificate members
      await tx.certificateMember.deleteMany({
        where: { orderId: orderId }
      });

      // Update the order with new details and members
      await tx.order.update({
        where: { id: orderId },
        data: {
          isCertificatePending,
          certificateTitle: certificateTitle || null,
          certificateNeedsReview: true,
          certificateMembers: {
              create: members
          }
        }
      });
    });
  } catch (err: any) {
     console.error("Error updating certificate data", err);
     return { error: "Ocurrió un error al guardar en la base de datos." };
  }

  revalidatePath(`/ordenes/${orderId}`);
  revalidatePath("/ordenes/produccion");

  return { success: true };
}

export async function updatePaymentStatus(formData: FormData) {
  const id = formData.get("id");
  const paymentStatus = formData.get("paymentStatus");

  if (typeof id !== "string" || typeof paymentStatus !== "string") {
    console.error("Invalid form data:", { id, paymentStatus });
    return;
  }

  await prisma.order.update({
    where: { id },
    data: { paymentStatus }
  });

  revalidatePath(`/ordenes/${id}`);
}

export async function updatePosTicket(formData: FormData) {
  const id = formData.get("id");
  const posTicketNumber = formData.get("posTicketNumber");

  if (typeof id !== "string" || typeof posTicketNumber !== "string") {
    console.error("Invalid form data:", { id, posTicketNumber });
    return;
  }

  await prisma.order.update({
    where: { id },
    data: { posTicketNumber }
  });

  revalidatePath(`/ordenes/${id}`);
  revalidatePath(`/ordenes/produccion`);
}
