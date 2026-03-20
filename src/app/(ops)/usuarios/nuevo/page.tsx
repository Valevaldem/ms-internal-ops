import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import NuevoUsuarioClient from "./client";

export const metadata = {
  title: "Nuevo Usuario | Maria Salinas",
};

export default async function NuevoUsuarioPage() {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const salesAssociates = await prisma.salesAssociate.findMany({
    where: { activeStatus: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <NuevoUsuarioClient salesAssociates={salesAssociates} />;
}
