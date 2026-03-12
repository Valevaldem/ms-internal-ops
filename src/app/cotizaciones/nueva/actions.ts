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
  const { associateId, marginProtectionEnabled, validUntilDate, totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment, marginProtectionAmount, finalClientPrice, ...data } = formData;

  const quotation = await prisma.quotation.create({
    data: {
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
      finalClientPrice: Number(finalClientPrice),

      validUntil: validUntilDate,
      daysRemaining: 15,
      status: "Draft",

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
