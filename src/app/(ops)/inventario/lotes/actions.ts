"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

const lotSchema = z.object({
  code: z.string().min(1, "El código del lote es requerido"),
  stoneName: z.string().min(1, "El nombre de la piedra es requerido"),
  cut: z.string().min(1, "El corte es requerido"),
  color: z.string().min(1, "El color es requerido"),
  pricePerCt: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  pricingMode: z.enum(["CT", "PZ"], { message: "El modo de precio debe ser CT o PZ" }),
  activeStatus: z.boolean().default(true),
})

export async function getStoneLots() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  return prisma.stoneLot.findMany({
    orderBy: { code: 'asc' }
  })
}

export async function createStoneLot(formData: any) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const parsed = lotSchema.safeParse(formData)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const data = parsed.data

  const existingLot = await prisma.stoneLot.findUnique({
    where: { code: data.code }
  })

  if (existingLot) {
    return {
      success: false,
      errors: {
        code: ["Ya existe un lote con este código"]
      }
    }
  }

  try {
    const newLot = await prisma.stoneLot.create({
      data
    })

    revalidatePath("/inventario/lotes")
    revalidatePath("/cotizaciones/nueva")

    return { success: true, lot: newLot }
  } catch (error) {
    console.error("Error creating stone lot:", error)
    return { success: false, error: "Error interno al crear el lote" }
  }
}

export async function updateStoneLot(code: string, formData: any) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const parsed = lotSchema.safeParse(formData)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const data = parsed.data

  try {
    const updatedLot = await prisma.stoneLot.update({
      where: { code },
      data: {
        stoneName: data.stoneName,
        cut: data.cut,
        color: data.color,
        pricePerCt: data.pricePerCt,
        pricingMode: data.pricingMode,
        activeStatus: data.activeStatus,
      }
    })

    revalidatePath("/inventario/lotes")
    revalidatePath("/cotizaciones/nueva")

    return { success: true, lot: updatedLot }
  } catch (error) {
    console.error("Error updating stone lot:", error)
    return { success: false, error: "Error interno al actualizar el lote" }
  }
}

export async function bulkUpsertStoneLots(lots: Record<string, unknown>[]) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  try {
    // Process sequentially or within a transaction
    // SQLite might have concurrency limits with raw massive transactions,
    // but Prisma $transaction array works fine for typical batch sizes.
    // For large uploads, processing sequentially or in chunks is safer.

    await prisma.$transaction(
      lots.map((lot) => {
        const parsed = lotSchema.parse(lot)
        return prisma.stoneLot.upsert({
          where: { code: parsed.code },
          update: {
            stoneName: parsed.stoneName,
            cut: parsed.cut,
            color: parsed.color,
            pricePerCt: parsed.pricePerCt,
            pricingMode: parsed.pricingMode,
            activeStatus: parsed.activeStatus,
          },
          create: {
            code: parsed.code,
            stoneName: parsed.stoneName,
            cut: parsed.cut,
            color: parsed.color,
            pricePerCt: parsed.pricePerCt,
            pricingMode: parsed.pricingMode,
            activeStatus: parsed.activeStatus,
          }
        })
      })
    )

    revalidatePath("/inventario/lotes")
    revalidatePath("/cotizaciones/nueva")

    return { success: true }
  } catch (error) {
    console.error("Error in bulk upsert:", error)
    return { success: false, error: "Error interno procesando los lotes." }
  }
}
