import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import { notFound } from "next/navigation";
import EditarMiembroClient from "./client";

export default async function EditarMiembroPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "designer"]);

  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
    include: { salesAssociate: true }
  });

  if (!member) notFound();

  const salesAssociates = await prisma.salesAssociate.findMany({
    where: { activeStatus: true, name: { not: { startsWith: "[STOCK]" } } },
    orderBy: { name: "asc" },
  });

  return <EditarMiembroClient member={member} salesAssociates={salesAssociates} />;
}
