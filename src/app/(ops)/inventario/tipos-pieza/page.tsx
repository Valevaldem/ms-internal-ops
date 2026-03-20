import { getCurrentUser, verifyAccess } from "@/lib/auth"
import { getPieceTypes } from "./actions"
import TiposPiezaClient from "./client"

export default async function TiposPiezaPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const pieceTypes = await getPieceTypes()

  return <TiposPiezaClient pieceTypes={pieceTypes} />
}
