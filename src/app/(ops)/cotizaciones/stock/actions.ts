"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function createStockQuotation(formData: any) {
  const {
    referenceCode, pieceType, modelId, modelBasePrice, modelName,
    notes, stones, totalStonesPrice, subtotal, finalClientPrice,
    operatorId, operatorName,
  } = formData

  const user = await getCurrentUser()

  // Buscar o crear un SalesAssociate para el operador de stock
  // Usamos el nombre del operador como identificador
  let stockAssociate = await prisma.salesAssociate.findFirst({
    where: { name: { startsWith: "[STOCK]" } }
  })
  if (!stockAssociate) {
    stockAssociate = await prisma.salesAssociate.create({
      data: {
        name: `[STOCK] ${operatorName}`,
        activeStatus: true,
        appliesMsAdjustment: false,
      }
    })
  }

  const count = await prisma.quotation.count({ where: { parentQuotationId: null } })
  const seq = (count + 1).toString().padStart(3, '0')
  const d = new Date()
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`
  const folio = `S-${mmyy}-${seq}-${(referenceCode || 'XX').slice(0, 4).toUpperCase()}`

  const stonesData = (stones || []).map((s: any) => ({
    lotCode: s.lotCode,
    stoneName: s.stoneName,
    quantity: s.quantity || 1,
    weightCt: s.weightCt,
    pricePerCt: s.pricePerCt,
    pricingMode: s.pricingMode || 'CT',
    stoneSubtotal: s.stoneSubtotal || 0,
  }))

  const quotation = await prisma.quotation.create({
    data: {
      folio,
      versionNumber: 1,
      type: 'Standard',
      // Sin datos de cliente — usamos referencia
      clientNameOrUsername: referenceCode || `Stock-${seq}`,
      salesChannel: 'Store',
      salesAssociateId: stockAssociate.id,
      pieceType,
      modelName: modelName || "",
      modelBasePrice: Number(modelBasePrice) || 0,
      notes: notes || null,
      stones: { create: stonesData },
      totalStonesPrice: Number(totalStonesPrice) || 0,
      subtotalBeforeAdjustments: Number(subtotal) || 0,
      msInternalAdjustment: 0,
      marginProtectionEnabled: false,
      marginProtectionPercent: 0,
      marginProtectionAmount: 0,
      discountPercent: 0,
      finalClientPrice: Number(finalClientPrice),
      validUntil: new Date(Date.now() + 90 * 86400000), // 90 días
      daysRemaining: 90,
      status: 'Pendiente de respuesta',
      tags: 'stock',
    }
  })

  revalidatePath('/cotizaciones/historial')
  return { id: quotation.id }
}
