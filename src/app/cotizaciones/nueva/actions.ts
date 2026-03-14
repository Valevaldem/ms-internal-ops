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

  const count = await prisma.quotation.count()
  const d = new Date()
  const mmyy = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`
  const seq = String(count + 1).padStart(3, '0')
  const associate = await prisma.salesAssociate.findUnique({ where: { id: associateId } })

  // Add fallback checks for names to prevent splitting undefined
  const safeAssocName = associate?.name || 'XX';
  const safeClientName = data.clientNameOrUsername || 'XX';

  const associateInitials = safeAssocName.split(' ').map((n: string) => n[0] || '').join('').substring(0, 2).toUpperCase() || 'XX'
  const clientInitials = safeClientName.split(' ').map((n: string) => n[0] || '').join('').substring(0, 2).toUpperCase() || 'XX'
  const generatedFolio = `${associateInitials}-${mmyy}-${seq}-${clientInitials}`

  const quotation = await prisma.quotation.create({
    data: {
      folio: generatedFolio,
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
      status: "Pendiente de respuesta",

      stones: {
        create: data.stones.map((s: any) => ({
          lotCode: s.lotCode,
          stoneName: s.stoneName,
          quantity: Number(s.quantity),
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
