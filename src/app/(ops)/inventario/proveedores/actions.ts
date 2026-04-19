"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

export async function createSupplier(name: string) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const cleaned = name.trim()
  if (!cleaned) throw new Error("El nombre es obligatorio.")

  const existing = await prisma.supplier.findUnique({ where: { name: cleaned } })
  if (existing) throw new Error("Ya existe un proveedor con ese nombre.")

  await prisma.supplier.create({
    data: { name: cleaned, activeStatus: true }
  })

  revalidatePath("/inventario/proveedores")
}

export async function renameSupplier(id: string, newName: string) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const cleaned = newName.trim()
  if (!cleaned) throw new Error("El nombre es obligatorio.")

  const existing = await prisma.supplier.findFirst({
    where: { name: cleaned, NOT: { id } }
  })
  if (existing) throw new Error("Ya existe un proveedor con ese nombre.")

  await prisma.supplier.update({
    where: { id },
    data: { name: cleaned }
  })

  revalidatePath("/inventario/proveedores")
}

export async function toggleSupplier(id: string, newStatus: boolean) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  await prisma.supplier.update({
    where: { id },
    data: { activeStatus: newStatus }
  })

  revalidatePath("/inventario/proveedores")
}

export async function deleteSupplier(id: string) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  // Si el proveedor ya tiene pedidos vinculados, desactivar en lugar de borrar
  const linked = await prisma.stockOrder.count({ where: { supplierId: id } })
  if (linked > 0) {
    await prisma.supplier.update({
      where: { id },
      data: { activeStatus: false }
    })
  } else {
    await prisma.supplier.delete({ where: { id } })
  }

  revalidatePath("/inventario/proveedores")
}
