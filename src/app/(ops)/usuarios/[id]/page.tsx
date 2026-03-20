import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import { notFound } from "next/navigation";
import EditarUsuarioClient from "./client";

export const metadata = {
  title: "Editar Usuario | Maria Salinas",
};

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const { id } = await params;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      activeStatus: true,
      salesAssociateId: true,
    },
  });

  if (!targetUser) {
    notFound();
  }

  const salesAssociates = await prisma.salesAssociate.findMany({
    where: { activeStatus: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <EditarUsuarioClient user={targetUser} salesAssociates={salesAssociates} />;
}
