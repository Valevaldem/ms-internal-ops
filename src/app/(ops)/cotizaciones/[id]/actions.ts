"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateStatus(id: string, status: string) {
  const allowedStatuses = [
    "Pendiente de respuesta",
    "En seguimiento",
    "Oportunidad de cierre",
    "Declinada"
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await prisma.quotation.update({
    where: { id },
    data: { status }
  });
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones/historial");
}