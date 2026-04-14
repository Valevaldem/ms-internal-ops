"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export async function updateQuotation(quotationId: string, formData: any) {
  const {
    totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment,
    marginProtectionAmount, discountPercent, finalClientPrice,
    marginProtectionEnabled, asDraft, ...data
  } = formData

  const user = await getCurrentUser()

  const existing = await prisma.quotation.findUnique({ where: { id: quotationId } })
  if (!existing) throw new Error("Cotización no encontrada")

  // Asesoras solo pueden editar sus propias cotizaciones
  if (user.role === 'advisor' && existing.salesAssociateId !== user.salesAssociateId) {
    throw new Error("No tienes permiso para editar esta cotización")
  }

  // No editar cotizaciones ya convertidas
  if (existing.status === 'Converted') throw new Error("No se puede editar una cotización ya convertida")

  const newStatus = asDraft ? 'Borrador' : (existing.status === 'Borrador' ? 'Pendiente de respuesta' : existing.status)

  const stonesData = (data.stones || []).map((s: any) => ({
    lotCode: s.lotCode,
    stoneName: s.stoneName,
    quantity: s.quantity || 1,
    weightCt: s.weightCt,
    pricePerCt: s.pricePerCt,
    pricingMode: s.pricingMode || 'CT',
    stoneSubtotal: s.stoneSubtotal || 0,
  }))

  // Eliminar piedras anteriores y recrear
  await prisma.quotationStone.deleteMany({ where: { quotationId } })

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      notes: data.notes || null,
      pieceType: data.pieceType,
      modelName: data.modelName || existing.modelName || "",
      modelBasePrice: Number(data.modelBasePrice) || existing.modelBasePrice || 0,
      stones: { create: stonesData },
      totalStonesPrice: Number(totalStonesPrice) || 0,
      subtotalBeforeAdjustments: Number(subtotalBeforeAdjustments) || 0,
      msInternalAdjustment: Number(msInternalAdjustment) || 0,
      marginProtectionEnabled: !!marginProtectionEnabled,
      marginProtectionAmount: Number(marginProtectionAmount) || 0,
      discountPercent: Number(discountPercent) || 0,
      finalClientPrice: Number(finalClientPrice),
      status: newStatus,
    }
  })

  revalidatePath(`/cotizaciones/${quotationId}`)
  revalidatePath('/cotizaciones/historial')
  redirect(`/cotizaciones/${quotationId}`)
}

export async function updateManualQuotation(quotationId: string, formData: any) {
  const { finalClientPrice, productionTiming, asDraft, ...data } = formData

  const user = await getCurrentUser()

  const existing = await prisma.quotation.findUnique({ where: { id: quotationId } })
  if (!existing) throw new Error("Cotización no encontrada")

  if (user.role === 'advisor' && existing.salesAssociateId !== user.salesAssociateId) {
    throw new Error("No tienes permiso para editar esta cotización")
  }

  if (existing.status === 'Converted') throw new Error("No se puede editar una cotización ya convertida")

  const newStatus = asDraft ? 'Borrador' : (existing.status === 'Borrador' ? 'Pendiente de respuesta' : existing.status)

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      pieceType: data.pieceType,
      manualPieceDescription: data.manualPieceDescription,
      notes: data.notes || null,
      productionTiming: productionTiming || "Regular",
      finalClientPrice: Number(finalClientPrice),
      status: newStatus,
    }
  })

  revalidatePath(`/cotizaciones/${quotationId}`)
  revalidatePath('/cotizaciones/historial')
  redirect(`/cotizaciones/${quotationId}`)
}
