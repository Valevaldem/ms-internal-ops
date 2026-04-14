import prisma from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { getCatalogs } from "../../nueva/actions"
import { getCurrentUser, verifyAccess } from "@/lib/auth"
import EditCotizacionClient from "./client"

export const dynamic = "force-dynamic"

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager', 'advisor'])

  const { id } = await params

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { stones: true, salesAssociate: true }
  })

  if (!quotation) notFound()

  // Solo puede editar el dueño o un manager
  if (user.role === 'advisor' && quotation.salesAssociateId !== user.salesAssociateId) {
    redirect(`/cotizaciones/${id}`)
  }

  // No editar convertidas
  if (quotation.status === 'Converted') redirect(`/cotizaciones/${id}`)

  const catalogs = await getCatalogs()

  // Buscar el modelId actual
  let modelId = ""
  if (quotation.modelName && quotation.pieceType) {
    const pt = await prisma.pieceType.findUnique({ where: { name: quotation.pieceType } })
    if (pt) {
      const model = await prisma.model.findFirst({
        where: { name: quotation.modelName, pieceTypeId: pt.id }
      })
      modelId = model?.id || ""
    }
  }

  const initialData = {
    ...quotation,
    modelId,
    stones: quotation.stones.map(s => ({
      lotCode: s.lotCode,
      stoneName: s.stoneName,
      quantity: s.quantity,
      weightCt: s.weightCt,
      pricePerCt: s.pricePerCt,
      pricingMode: s.pricingMode,
      stoneSubtotal: s.stoneSubtotal,
    }))
  }

  return (
    <EditCotizacionClient
      quotationId={id}
      catalogs={catalogs}
      initialData={initialData}
      activeUser={user}
      isManual={quotation.type === 'Manual'}
    />
  )
}
