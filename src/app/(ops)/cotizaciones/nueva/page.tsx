import { getCatalogs } from "./actions"
import NuevaCotizacionClient from "./client"

import prisma from "@/lib/prisma"
import { getCurrentUser, verifyAccess } from "@/lib/auth"

export default async function NuevaCotizacionPage({ searchParams }: { searchParams: Promise<{ versionFromId?: string }> }) {
  const user = await getCurrentUser()
  verifyAccess(user, ['manager', 'advisor']);

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
      const pt = await prisma.pieceType.findUnique({ where: { name: parent.pieceType } });
      const model = await prisma.model.findFirst({
        where: { name: parent.modelName || "", pieceTypeId: pt?.id || "" }
      });

      initialData = {
        ...parent,
        modelId: model?.id || "",
      };
    }
  }

  return <NuevaCotizacionClient catalogs={catalogs} initialData={initialData} activeUser={user} />
}
