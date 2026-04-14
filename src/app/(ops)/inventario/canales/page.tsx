import prisma from "@/lib/prisma"
import { getCurrentUser, verifyAccess } from "@/lib/auth"
import CanalesClient from "./client"

export const dynamic = "force-dynamic"

export default async function CanalesVentaPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const channels = await prisma.salesChannel.findMany({
    orderBy: { name: 'asc' }
  })

  return <CanalesClient channels={channels} />
}
