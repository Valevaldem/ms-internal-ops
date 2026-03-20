import { getCurrentUser, verifyAccess } from "@/lib/auth"
import { getModels, getPieceTypes } from "./actions"
import ModelosClient from "./client"

export default async function ModelosPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager'])

  const models = await getModels()
  const pieceTypes = await getPieceTypes()

  return <ModelosClient models={models} pieceTypes={pieceTypes} />
}
