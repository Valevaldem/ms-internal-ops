import { getCatalogs } from "../nueva/actions"
import CotizacionStockClient from "./client"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function CotizacionStockPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['stock_operator', 'manager'], "/")

  const catalogs = await getCatalogs()

  return <CotizacionStockClient catalogs={catalogs} activeUser={user} />
}
