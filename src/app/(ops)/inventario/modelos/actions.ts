"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

const modelSchema = z.object({
  name: z.string().min(1, "El nombre del modelo es requerido"),
  pieceType: z.string().min(1, "El tipo de pieza es requerido"),
  basePrice: z.coerce.number().min(0, "El precio base debe ser mayor o igual a 0"),
  activeStatus: z.boolean().default(true),
})

export async function getModels() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  return prisma.model.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function getPieceTypes() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  return prisma.pieceType.findMany({
    where: { activeStatus: true },
    orderBy: { name: 'asc' }
  })
}

export async function createModel(formData: any) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const parsed = modelSchema.safeParse(formData)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const data = parsed.data

  // Verify unique name
  const existingModel = await prisma.model.findFirst({
    where: { name: data.name, pieceType: data.pieceType }
  })

  if (existingModel) {
    return {
      success: false,
      errors: {
        name: ["Ya existe un modelo con este nombre y tipo de pieza"]
      }
    }
  }

  try {
    const newModel = await prisma.model.create({
      data
    })

    revalidatePath("/inventario/modelos")
    revalidatePath("/cotizaciones/nueva")

    return { success: true, model: newModel }
  } catch (error) {
    console.error("Error creating model:", error)
    return { success: false, error: "Error interno al crear el modelo" }
  }
}

export async function updateModel(id: string, formData: any) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const parsed = modelSchema.safeParse(formData)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const data = parsed.data

  // Verify unique name + pieceType (excluding current model)
  const existingModel = await prisma.model.findFirst({
    where: {
      name: data.name,
      pieceType: data.pieceType,
      id: { not: id }
    }
  })

  if (existingModel) {
    return {
      success: false,
      errors: {
        name: ["Ya existe un modelo con este nombre y tipo de pieza"]
      }
    }
  }

  try {
    const updatedModel = await prisma.model.update({
      where: { id },
      data: {
        name: data.name,
        pieceType: data.pieceType,
        basePrice: data.basePrice,
        activeStatus: data.activeStatus,
      }
    })

    revalidatePath("/inventario/modelos")
    revalidatePath("/cotizaciones/nueva")

    return { success: true, model: updatedModel }
  } catch (error) {
    console.error("Error updating model:", error)
    return { success: false, error: "Error interno al actualizar el modelo" }
  }
}
