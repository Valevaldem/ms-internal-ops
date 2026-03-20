import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import { notFound } from "next/navigation";
import EditarAsesoraClient from "./client";

export default async function EditarAsesoraPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const { id } = await params;

  const asesora = await prisma.salesAssociate.findUnique({
    where: { id },
  });

  if (!asesora) {
    notFound();
  }

  return <EditarAsesoraClient asesora={asesora} />;
}
