"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateQuotationStatus(id: string, newStatus: string) {
  await prisma.quotation.update({
    where: { id },
    data: { status: newStatus }
  })
  revalidatePath(`/cotizaciones/${id}`)
  revalidatePath("/cotizaciones/historial")
}

export async function updateQuotationDiscount(id: string, newDiscountPercent: number) {
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) throw new Error("Not found");

  const rawClientPrice = quotation.subtotalBeforeAdjustments + quotation.msInternalAdjustment + quotation.marginProtectionAmount;

  const getRoundedCommercialPrice = (price: number) => {
    if (price <= 0) return 0;
    const baseThousand = Math.floor(price / 1000) * 1000;
    const remainder = price % 1000;

    if (remainder === 0) return baseThousand;
    if (remainder <= 500) return baseThousand + 500;
    if (remainder <= 850) return baseThousand + 850;
    return baseThousand + 1000;
  };

  const roundedPriceBeforeDiscount = getRoundedCommercialPrice(rawClientPrice);
  const calculatedDiscountAmount = (roundedPriceBeforeDiscount * newDiscountPercent) / 100;
  const finalClientPrice = roundedPriceBeforeDiscount - calculatedDiscountAmount;

  await prisma.quotation.update({
    where: { id },
    data: {
      discountPercent: newDiscountPercent,
      finalClientPrice
    }
  });

  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones/historial");
}
