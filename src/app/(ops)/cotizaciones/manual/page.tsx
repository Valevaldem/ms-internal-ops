import { getCatalogs } from "../nueva/actions"
import NuevaCotizacionManualClient from "./client"

import { getCurrentUser, verifyAccess } from "@/lib/auth"

export const dynamic = "force-dynamic";

export default async function NuevaCotizacionManualPage() {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager', 'advisor']);

  const catalogs = await getCatalogs()

  return <NuevaCotizacionManualClient catalogs={catalogs} activeUser={user} />
}