"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function createManualCertRequest(data: {
  clientName: string
  pieceDescription: string
  advisorName: string
  notes?: string
  certificateTitle?: string
}) {
  const user = await getCurrentUser()

  const count = await prisma.manualCertificateRequest.count()
  const seq = (count + 1).toString().padStart(3, '0')
  const d = new Date()
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`
  const folio = `MC-${mmyy}-${seq}`

  await prisma.manualCertificateRequest.create({
    data: {
      folio,
      clientName: data.clientName,
      pieceDescription: data.pieceDescription,
      advisorName: data.advisorName,
      notes: data.notes || null,
      certificateTitle: data.certificateTitle || null,
      status: 'Pendiente',
    }
  })

  revalidatePath('/certificados/manual')
}

export async function toggleManualCertField(id: string, field: string, value: boolean) {
  const user = await getCurrentUser()

  await prisma.manualCertificateRequest.update({
    where: { id },
    data: { [field]: value }
  })

  revalidatePath('/certificados/manual')
}

export async function deleteManualCertRequest(id: string) {
  await prisma.manualCertificateRequest.delete({ where: { id } })
  revalidatePath('/certificados/manual')
}
