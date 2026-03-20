"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

const pieceTypeSchema = z.object({
  name: z.string().min(1, "El nombre del tipo de pieza es requerido"),
  activeStatus: z.boolean().default(true),
})

export async function getPieceTypes() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  return prisma.pieceType.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function createPieceType(formData: any) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const parsed = pieceTypeSchema.safeParse(formData)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const data = parsed.data

  const existingType = await prisma.pieceType.findFirst({
    where: { name: data.name }
  })

  if (existingType) {
    return {
      success: false,
      errors: {
        name: ["Ya existe un tipo de pieza con este nombre"]
      }
    }
  }

  try {
    const newType = await prisma.pieceType.create({
      data
    })

    revalidatePath("/inventario/tipos-pieza")
    revalidatePath("/inventario/modelos")
    revalidatePath("/cotizaciones/nueva")

    return { success: true, pieceType: newType }
  } catch (error) {
    console.error("Error creating piece type:", error)
    return { success: false, error: "Error interno al crear el tipo de pieza" }
  }
}

export async function updatePieceType(id: string, formData: any) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const parsed = pieceTypeSchema.safeParse(formData)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const data = parsed.data

  const existingType = await prisma.pieceType.findFirst({
    where: {
      name: data.name,
      id: { not: id }
    }
  })

  if (existingType) {
    return {
      success: false,
      errors: {
        name: ["Ya existe un tipo de pieza con este nombre"]
      }
    }
  }

  try {
    const updatedType = await prisma.pieceType.update({
      where: { id },
      data: {
        name: data.name,
        activeStatus: data.activeStatus,
      }
    })

    revalidatePath("/inventario/tipos-pieza")
    revalidatePath("/inventario/modelos")
    revalidatePath("/cotizaciones/nueva")

    return { success: true, pieceType: updatedType }
  } catch (error) {
    console.error("Error updating piece type:", error)
    return { success: false, error: "Error interno al actualizar el tipo de pieza" }
  }
}
