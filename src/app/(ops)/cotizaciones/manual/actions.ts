"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export async function createManualQuotation(formData: any) {
  const { associateId, finalClientPrice, productionTiming, validUntilDate, asDraft, ...data } = formData;

  const user = await getCurrentUser();
  const finalAssociateId = user.role === 'advisor' && user.salesAssociateId
    ? user.salesAssociateId : associateId;

  const count = await prisma.quotation.count({ where: { parentQuotationId: null } });
  const seq = (count + 1).toString().padStart(3, '0');
  const d = new Date();
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;
  const assoc = await prisma.salesAssociate.findUnique({ where: { id: finalAssociateId } });
  const assocInitials = assoc?.name.slice(0, 2).toUpperCase() || 'XX';
  const clientInitials = (data.clientNameOrUsername || 'XX').slice(0, 2).toUpperCase().padEnd(2, 'X');
  const folio = `M-${assocInitials}-${mmyy}-${seq}-${clientInitials}`;

  const quotation = await prisma.quotation.create({
    data: {
      type: "Manual", folio, versionNumber: 1,
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      salesAssociateId: finalAssociateId,
      pieceType: data.pieceType,
      manualPieceDescription: data.manualPieceDescription,
      notes: data.notes || null,
      productionTiming: productionTiming || "Regular",
      finalClientPrice: Number(finalClientPrice),
      validUntil: validUntilDate,
      daysRemaining: 15,
      status: asDraft ? 'Borrador' : 'Pendiente de respuesta',
      modelName: "", modelBasePrice: null,
      totalStonesPrice: null, subtotalBeforeAdjustments: null,
    }
  });

  revalidatePath('/cotizaciones/historial');
  if (asDraft) return { id: quotation.id };
  redirect(`/cotizaciones/${quotation.id}`);
}
