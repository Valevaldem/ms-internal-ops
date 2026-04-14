"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function createManualCertRequest(data: {
  clientName: string
  invoiceNumber?: string
  pieceDescription: string
  advisorName: string
  certificateTitle?: string
  stonesData?: any[]
}) {
  await getCurrentUser()

  const count = await prisma.manualCertificateRequest.count()
  const seq = (count + 1).toString().padStart(3, '0')
  const d = new Date()
  const mmyy = `${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`
  const folio = `MC-${mmyy}-${seq}`

  await prisma.manualCertificateRequest.create({
    data: {
      folio,
      clientName: data.clientName,
      invoiceNumber: data.invoiceNumber || null,
      pieceDescription: data.pieceDescription,
      advisorName: data.advisorName,
      certificateTitle: data.certificateTitle || null,
      stonesData: data.stonesData ? JSON.stringify(data.stonesData) : null,
      status: 'Pendiente',
    }
  })

  revalidatePath('/certificados/manual')
}

export async function toggleManualCertField(id: string, field: string, value: boolean) {
  await getCurrentUser()
  await prisma.manualCertificateRequest.update({
    where: { id },
    data: { [field]: value }
  })
  revalidatePath('/certificados/manual')
}

export async function deleteManualCertRequest(id: string) {
  await getCurrentUser()
  await prisma.manualCertificateRequest.delete({ where: { id } })
  revalidatePath('/certificados/manual')
}
