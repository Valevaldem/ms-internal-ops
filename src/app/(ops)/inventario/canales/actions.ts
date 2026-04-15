"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

export async function createChannel(name: string) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  if (!name || name.trim() === '') throw new Error("El nombre es requerido")

  const existing = await prisma.salesChannel.findUnique({ where: { name: name.trim() } })
  if (existing) throw new Error("Ya existe un canal con ese nombre")

  const id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  await prisma.salesChannel.create({
    data: { id, name: name.trim(), activeStatus: true }
  })

  revalidatePath('/inventario/canales')
}

export async function toggleChannel(id: string, active: boolean) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  await prisma.salesChannel.update({
    where: { id },
    data: { activeStatus: active }
  })

  revalidatePath('/inventario/canales')
}

export async function deleteChannel(id: string) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  await prisma.salesChannel.delete({ where: { id } })
  revalidatePath('/inventario/canales')
}

export async function getActiveChannels() {
  return prisma.salesChannel.findMany({
    where: { activeStatus: true },
    orderBy: { name: 'asc' }
  })
}
