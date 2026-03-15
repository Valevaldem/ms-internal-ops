import { getCatalogs } from "./actions"
import NuevaCotizacionClient from "./client"

import prisma from "@/lib/prisma"

export default async function NuevaCotizacionPage({ searchParams }: { searchParams: Promise<{ versionFromId?: string }> }) {
  const catalogs = await getCatalogs()
  const params = await searchParams

  let initialData = null;
  if (params.versionFromId) {
    const parent = await prisma.quotation.findUnique({
      where: { id: params.versionFromId },
      include: { stones: true }
    });

    if (parent) {
      // Find model id based on modelName and pieceType
      const model = await prisma.model.findFirst({
        where: { name: parent.modelName, pieceType: parent.pieceType }
      });

      initialData = {
        ...parent,
        modelId: model?.id || "",
      };
    }
  }

  return <NuevaCotizacionClient catalogs={catalogs} initialData={initialData} />
}
