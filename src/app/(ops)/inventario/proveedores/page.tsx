import prisma from "@/lib/prisma"
import { getCurrentUser, verifyAccess } from "@/lib/auth"
import ProveedoresClient from "./client"

export const dynamic = "force-dynamic"

export default async function ProveedoresPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  })

  return <ProveedoresClient suppliers={suppliers} />
}
