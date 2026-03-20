"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"

export async function getCatalogs() {
  const associates = await prisma.salesAssociate.findMany({ where: { activeStatus: true } })
  const models = await prisma.model.findMany({ where: { activeStatus: true } })
  const stones = await prisma.stoneLot.findMany({ where: { activeStatus: true } })
  return { associates, models, stones }
}

export async function createQuotation(formData: any) {
  const { associateId, marginProtectionEnabled, validUntilDate, totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment, marginProtectionAmount, discountPercent, finalClientPrice, versionFromId, ...data } = formData;

  const user = await getCurrentUser();
  const finalAssociateId = user.role === 'advisor' && user.salesAssociateId ? user.salesAssociateId : associateId;

  let folio = "";
  let versionNumber = 1;
  let parentQuotationId = null;

  if (versionFromId) {
    const parent = await prisma.quotation.findUnique({
      where: { id: versionFromId },
      include: { versions: true }
    });

    if (parent) {
      // Find the ultimate parent if we are versioning a version
      const ultimateParentId = parent.parentQuotationId || parent.id;
      parentQuotationId = ultimateParentId;

      const ultimateParent = await prisma.quotation.findUnique({
        where: { id: ultimateParentId },
        include: { versions: true }
      });

      versionNumber = (ultimateParent?.versions.length || 0) + 2; // +1 for original, +1 for next

      // Extract base folio
      const baseFolio = ultimateParent?.folio?.split('-V')[0] || parent.folio?.split('-V')[0] || "FOLIO";
      folio = `${baseFolio}-V${versionNumber}`;
    }
  }

  if (!folio) {
    // Generate logical folio: AA-MMYY-001-CC
    const count = await prisma.quotation.count({ where: { parentQuotationId: null } });
    const seq = (count + 1).toString().padStart(3, '0');
    const d = new Date();
    const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;

    const assoc = await prisma.salesAssociate.findUnique({ where: { id: finalAssociateId } });
    const assocInitials = assoc?.name.slice(0, 2).toUpperCase() || 'XX';

    const clientName = data.clientNameOrUsername || 'XX';
    const clientInitials = clientName.slice(0, 2).toUpperCase().padEnd(2, 'X');

    folio = `${assocInitials}-${mmyy}-${seq}-${clientInitials}`;
  }

  const quotation = await prisma.quotation.create({
    data: {
      folio,
      versionNumber,
      parentQuotationId,
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      salesAssociateId: finalAssociateId,
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
          quantity: Number(s.quantity || 1),
          weightCt: Number(s.weightCt),
          pricePerCt: Number(s.pricePerCt),
          pricingMode: s.pricingMode || "CT",
          stoneSubtotal: Number(s.stoneSubtotal)
        }))
      }
    }
  })

  revalidatePath('/cotizaciones/historial')
  return { id: quotation.id }
}
