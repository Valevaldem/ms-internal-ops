"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export async function getCatalogs() {
  const associates = await prisma.salesAssociate.findMany({ where: { activeStatus: true } })
  const models = await prisma.model.findMany({ where: { activeStatus: true } })
  const stones = await prisma.stoneLot.findMany({ where: { activeStatus: true } })
  const pieceTypes = await prisma.pieceType.findMany({ where: { activeStatus: true }, orderBy: { name: 'asc' } })
  return { associates, models, stones, pieceTypes }
}

export async function createQuotation(formData: any) {
  const {
    associateId, marginProtectionEnabled, validUntilDate,
    totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment,
    marginProtectionAmount, discountPercent, finalClientPrice,
    versionFromId, asDraft, ...data
  } = formData;

  const user = await getCurrentUser();
  const finalAssociateId = user.role === 'advisor' && user.salesAssociateId
    ? user.salesAssociateId : associateId;

  if (data.modelId) {
    const pt = await prisma.pieceType.findUnique({ where: { name: data.pieceType } });
    if (pt) {
      const model = await prisma.model.findUnique({ where: { id: data.modelId } });
      if (!model || model.pieceTypeId !== pt.id) throw new Error("El modelo no pertenece al tipo de pieza.");
      if (user.role !== 'manager' && Number(data.modelBasePrice) !== model.basePrice) throw new Error("El precio base no puede modificarse.");
    }
  }

  let folio = "", versionNumber = 1, parentQuotationId = null;

  if (versionFromId) {
    const parent = await prisma.quotation.findUnique({ where: { id: versionFromId }, include: { versions: true } });
    if (parent) {
      const ultimateParentId = parent.parentQuotationId || parent.id;
      parentQuotationId = ultimateParentId;
      const ultimateParent = await prisma.quotation.findUnique({ where: { id: ultimateParentId }, include: { versions: true } });
      versionNumber = (ultimateParent?.versions.length || 0) + 2;
      const baseFolio = ultimateParent?.folio?.split('-V')[0] || parent.folio?.split('-V')[0] || "FOLIO";
      folio = `${baseFolio}-V${versionNumber}`;
    }
  }

  if (!folio) {
    const count = await prisma.quotation.count({ where: { parentQuotationId: null } });
    const seq = (count + 1).toString().padStart(3, '0');
    const d = new Date();
    const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;
    const assoc = await prisma.salesAssociate.findUnique({ where: { id: finalAssociateId } });
    const assocInitials = assoc?.name.slice(0, 2).toUpperCase() || 'XX';
    const clientInitials = (data.clientNameOrUsername || 'XX').slice(0, 2).toUpperCase().padEnd(2, 'X');
    folio = `${assocInitials}-${mmyy}-${seq}-${clientInitials}`;
  }

  const stonesData = (data.stones || []).map((s: any) => ({
    lotCode: s.lotCode, stoneName: s.stoneName, quantity: s.quantity || 1,
    weightCt: s.weightCt, pricePerCt: s.pricePerCt,
    pricingMode: s.pricingMode || 'CT', stoneSubtotal: s.stoneSubtotal || 0,
  }));

  const quotation = await prisma.quotation.create({
    data: {
      folio, versionNumber, parentQuotationId,
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      salesAssociateId: finalAssociateId,
      type: 'Standard',
      pieceType: data.pieceType,
      modelName: data.modelName || "",
      modelBasePrice: Number(data.modelBasePrice) || 0,
      notes: data.notes || null,
      stones: { create: stonesData },
      totalStonesPrice: Number(totalStonesPrice) || 0,
      subtotalBeforeAdjustments: Number(subtotalBeforeAdjustments) || 0,
      msInternalAdjustment: Number(msInternalAdjustment) || 0,
      marginProtectionEnabled: !!marginProtectionEnabled,
      marginProtectionPercent: 15,
      marginProtectionAmount: Number(marginProtectionAmount) || 0,
      discountPercent: Number(discountPercent) || 0,
      finalClientPrice: Number(finalClientPrice),
      validUntil: validUntilDate,
      daysRemaining: 15,
      status: asDraft ? 'Borrador' : 'Pendiente de respuesta',
    }
  });

  revalidatePath('/cotizaciones/historial');
  if (asDraft) return { id: quotation.id };
  redirect(`/cotizaciones/${quotation.id}`);
}
