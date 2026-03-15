"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

export async function getCatalogs() {
  const associates = await prisma.salesAssociate.findMany({ where: { activeStatus: true } })
  const models = await prisma.model.findMany({ where: { activeStatus: true } })
  const stones = await prisma.stoneLot.findMany({ where: { activeStatus: true } })
  return { associates, models, stones }
}

export async function createQuotation(formData: any) {
  const { associateId, marginProtectionEnabled, validUntilDate, totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment, marginProtectionAmount, discountPercent, finalClientPrice, ...data } = formData;

  // Generate logical folio: AA-MMYY-001-CC
  const count = await prisma.quotation.count();
  const seq = (count + 1).toString().padStart(3, '0');
  const d = new Date();
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;

  const assoc = await prisma.salesAssociate.findUnique({ where: { id: associateId } });
  const assocInitials = assoc?.name.slice(0, 2).toUpperCase() || 'XX';

  const clientName = data.clientNameOrUsername || 'XX';
  const clientInitials = clientName.slice(0, 2).toUpperCase().padEnd(2, 'X');

  const folio = `${assocInitials}-${mmyy}-${seq}-${clientInitials}`;

  const quotation = await prisma.quotation.create({
    data: {
      folio,
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      salesAssociateId: associateId,
      pieceType: data.pieceType,
      modelName: data.modelName,
      modelBasePrice: Number(data.modelBasePrice),
      notes: data.notes || null,

      totalStonesPrice: Number(totalStonesPrice),
      subtotalBeforeAdjustments: Number(subtotalBeforeAdjustments),
      msInternalAdjustment: Number(msInternalAdjustment),
      marginProtectionEnabled: Boolean(marginProtectionEnabled),
      marginProtectionPercent: 15,
      marginProtectionAmount: Number(marginProtectionAmount),
      discountPercent: Number(discountPercent || 0),
      finalClientPrice: Number(finalClientPrice),

      validUntil: validUntilDate,
      daysRemaining: 15,
      status: "Pendiente de respuesta",

      stones: {
        create: data.stones.map((s: any) => ({
          lotCode: s.lotCode,
          stoneName: s.stoneName,
          weightCt: Number(s.weightCt),
          pricePerCt: Number(s.pricePerCt),
          stoneSubtotal: Number(s.stoneSubtotal)
        }))
      }
    }
  })

  revalidatePath('/cotizaciones/historial')
  return { id: quotation.id }
}
