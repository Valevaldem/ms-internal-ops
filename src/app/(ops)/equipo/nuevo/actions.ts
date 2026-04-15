"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export async function createMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "designer"]);

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const salesAssociateId = formData.get("salesAssociateId") as string;
  const appliesMsAdjustment = formData.get("appliesMsAdjustment") === "on";

  if (!name || !username || !password || !role) {
    return { error: "Todos los campos son obligatorios." };
  }

  const needsAssociate = ["advisor", "designer"].includes(role);
  if (needsAssociate && !salesAssociateId) {
    return { error: "Este rol requiere un perfil de ventas vinculado." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "El nombre de usuario ya está en uso." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Para stock_operator crear perfil automáticamente
  let finalAssociateId: string | null = needsAssociate ? salesAssociateId : null;

  if (role === "stock_operator") {
    const stockAssoc = await prisma.salesAssociate.create({
      data: { name: `[STOCK] ${name}`, activeStatus: true, appliesMsAdjustment: false }
    });
    finalAssociateId = stockAssoc.id;
  }

  // Actualizar appliesMsAdjustment en el perfil vinculado si es designer
  if (role === "designer" && salesAssociateId) {
    await prisma.salesAssociate.update({
      where: { id: salesAssociateId },
      data: { appliesMsAdjustment }
    });
  }

  await prisma.user.create({
    data: { name, username, passwordHash, role, salesAssociateId: finalAssociateId, activeStatus: true }
  });

  redirect("/equipo");
}
