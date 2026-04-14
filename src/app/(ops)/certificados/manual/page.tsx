import prisma from "@/lib/prisma"
import { getCurrentUser, verifyAccess } from "@/lib/auth"
import ManualCertClient from "./client"

export const dynamic = "force-dynamic"

export default async function CertificadosManualPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager', 'certificate_operator'])

  const requests = await prisma.manualCertificateRequest.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return <ManualCertClient requests={requests} />
}
