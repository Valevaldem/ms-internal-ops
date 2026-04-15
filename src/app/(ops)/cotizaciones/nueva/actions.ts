"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function getCatalogs() {
  const associates = await prisma.salesAssociate.findMany({ where: { activeStatus: true } })
  const models = await prisma.model.findMany({
    where: { activeStatus: true },
    include: { pieceType: true }
  })
  const stones = await prisma.stoneLot.findMany({ where: { activeStatus: true } })
  const pieceTypes = await prisma.pieceType.findMany({ where: { activeStatus: true }, orderBy: { name: 'asc' } })
  return { associates, models, stones, pieceTypes }
}

export async function createQuotation(formData: any) {
  const {
    associateId,
    marginProtectionEnabled,
    validUntilDate,
    totalStonesPrice,
    subtotalBeforeAdjustments,
    msInternalAdjustment,
    marginProtectionAmount,
    discountPercent,
    finalClientPrice,
    versionFromId,
    isCustomModel,
    customProductionDays,
    ...data
  } = formData;

  const user = await getCurrentUser();
  const finalAssociateId = user.role === 'advisor' && user.salesAssociateId ? user.salesAssociateId : associateId;

  // Backend validation: only validate model if not custom
  if (data.modelId && !isCustomModel) {
    const pt = await prisma.pieceType.findUnique({ where: { name: data.pieceType } });
    if (pt) {
      const model = await prisma.model.findUnique({ where: { id: data.modelId } });
      if (!model || model.pieceTypeId !== pt.id) {
        throw new Error("El modelo seleccionado no pertenece al tipo de pieza seleccionado.");
      }
      const submittedBasePrice = Number(data.modelBasePrice);
      if (user.role !== 'manager' && submittedBasePrice !== model.basePrice) {
        throw new Error("El precio base del modelo no puede ser modificado libremente.");
      }
    }
  }

  let folio = "";
  let versionNumber = 1;
  let parentQuotationId = null;

  if (versionFromId) {
    const parent = await prisma.quotation.findUnique({
      where: { id: versionFromId },
      include: { versions: true }
    });

    if (parent) {
      const ultimateParentId = parent.parentQuotationId || parent.id;
      parentQuotationId = ultimateParentId;

      const ultimateParent = await prisma.quotation.findUnique({
        where: { id: ultimateParentId },
        include: { versions: true }
      });

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

    const clientName = data.clientNameOrUsername || 'XX';
    const clientInitials = clientName.slice(0, 2).toUpperCase().padEnd(2, 'X');

    folio = `${assocInitials}-${mmyy}-${seq}-${clientInitials}`;
  }

  const quotation = await prisma.quotation.create({
    data: {
      folio,
      versionNumber,
      parentQuotationId,
      type: "Standard",
      clientNameOrUsername: data.clientNameOrUsername,
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel,
      salesAssociateId: finalAssociateId,
      pieceType: data.pieceType,
      modelName: data.modelName || (isCustomModel ? "Personalizado" : ""),
      modelBasePrice: Number(data.modelBasePrice),
      notes: data.notes || null,
      manualPieceDescription: isCustomModel ? (data.manualPieceDescription || null) : null,
      customProductionDays: isCustomModel ? (Number(customProductionDays) || null) : null,

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
        create: (data.stones || []).map((s: any) => ({
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

export async function saveDraftQuotation(formData: any) {
  const {
    associateId, marginProtectionEnabled, validUntilDate,
    totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment,
    marginProtectionAmount, discountPercent, finalClientPrice,
    isCustomModel, customProductionDays, ...data
  } = formData;

  const user = await getCurrentUser();
  const finalAssociateId = user.role === 'advisor' && user.salesAssociateId
    ? user.salesAssociateId
    : associateId;

  // Generar folio para borrador
  const count = await prisma.quotation.count({ where: { parentQuotationId: null } });
  const seq = (count + 1).toString().padStart(3, '0');
  const d = new Date();
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;
  const assoc = await prisma.salesAssociate.findUnique({ where: { id: finalAssociateId } });
  const assocInitials = assoc?.name.slice(0, 2).toUpperCase() || 'XX';
  const clientInitials = (data.clientNameOrUsername || 'XX').slice(0, 2).toUpperCase().padEnd(2, 'X');
  const folio = `BOR-${assocInitials}-${mmyy}-${seq}-${clientInitials}`;

  const quotation = await prisma.quotation.create({
    data: {
      folio,
      versionNumber: 1,
      parentQuotationId: null,
      type: "Standard",
      status: "Borrador",
      clientNameOrUsername: data.clientNameOrUsername || "Sin nombre",
      phoneNumber: data.phoneNumber || null,
      salesChannel: data.salesChannel || "Store",
      salesAssociateId: finalAssociateId,
      pieceType: data.pieceType || "",
      modelName: data.modelName || null,
      modelBasePrice: Number(data.modelBasePrice) || null,
      notes: data.notes || null,
      manualPieceDescription: isCustomModel ? (data.manualPieceDescription || null) : null,
      customProductionDays: isCustomModel ? (Number(customProductionDays) || null) : null,
      totalStonesPrice: Number(totalStonesPrice) || 0,
      subtotalBeforeAdjustments: Number(subtotalBeforeAdjustments) || 0,
      msInternalAdjustment: Number(msInternalAdjustment) || 0,
      marginProtectionEnabled: false,
      marginProtectionPercent: 15,
      marginProtectionAmount: 0,
      discountPercent: Number(discountPercent) || 0,
      finalClientPrice: Number(finalClientPrice) || 0,
      validUntil: validUntilDate,
      daysRemaining: 15,
      stones: {
        create: (data.stones || []).map((s: any) => ({
          lotCode: s.lotCode,
          stoneName: s.stoneName,
          quantity: Number(s.quantity || 1),
          weightCt: Number(s.weightCt) || 0,
          pricePerCt: Number(s.pricePerCt) || 0,
          pricingMode: s.pricingMode || "CT",
          stoneSubtotal: Number(s.stoneSubtotal) || 0,
        }))
      }
    }
  });

  revalidatePath('/cotizaciones/historial');
  return { id: quotation.id };
}
