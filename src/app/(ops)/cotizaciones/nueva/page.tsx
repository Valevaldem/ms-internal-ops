import { getCatalogs } from "./actions"
import NuevaCotizacionClient from "./client"

export default async function NuevaCotizacionPage() {
  const catalogs = await getCatalogs()
  return <NuevaCotizacionClient catalogs={catalogs} />
}
