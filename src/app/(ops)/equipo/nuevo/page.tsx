import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import NuevoMiembroClient from "./client";

export default async function NuevoMiembroPage() {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "designer"]);

  const salesAssociates = await prisma.salesAssociate.findMany({
    where: { activeStatus: true, name: { not: { startsWith: "[STOCK]" } } },
    orderBy: { name: "asc" },
  });

  return <NuevoMiembroClient salesAssociates={salesAssociates} />;
}
