"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"

export async function createManualQuotation(formData: any) {
  const { associateId, finalClientPrice, productionTiming, validUntilDate, ...data } = formData;

  const user = await getCurrentUser();
  const finalAssociateId = user.role === 'advisor' && user.salesAssociateId ? user.salesAssociateId : associateId;

  let folio = "";

  // Generate distinct logical folio for manual quotations: M-AA-MMYY-001-CC
  const count = await prisma.quotation.count({ where: { parentQuotationId: null } });
  const seq = (count + 1).toString().padStart(3, '0');
  const d = new Date();
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;

  const assoc = await prisma.salesAssociate.findUnique({ where: { id: finalAssociateId } });
  const assocInitials = assoc?.name.slice(0, 2).toUpperCase() || 'XX';

  const clientName = data.clientNameOrUsername || 'XX';
  const clientInitials = clientName.slice(0, 2).toUpperCase().padEnd(2, 'X');

  folio = `M-${assocInitials}-${mmyy}-${seq}-${clientInitials}`;

  const quotation = await prisma.quotation.create({
    data: {
      type: "Manual",
      folio,
      versionNumber: 1,
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
      status: "Pendiente de respuesta",
      modelName: "",
      modelBasePrice: null,
      totalStonesPrice: null,
      subtotalBeforeAdjustments: null
    }
  })

  revalidatePath('/cotizaciones/historial')
  return { id: quotation.id }
}