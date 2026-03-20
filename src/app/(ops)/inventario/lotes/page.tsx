import { getCurrentUser, verifyAccess } from "@/lib/auth"
import { getStoneLots } from "./actions"
import StoneLotsClient from "./client"

export default async function StoneLotsPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const lots = await getStoneLots()

  return <StoneLotsClient lots={lots} />
}
