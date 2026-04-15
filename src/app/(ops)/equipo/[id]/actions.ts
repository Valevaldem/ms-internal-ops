"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export async function updateMemberAction(memberId: string, formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "designer"]);

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const role = formData.get("role") as string;
  const salesAssociateId = formData.get("salesAssociateId") as string;
  const activeStatus = formData.get("activeStatus") === "on";
  const password = formData.get("password") as string;
  const appliesMsAdjustment = formData.get("appliesMsAdjustment") === "on";

  if (!name || !username || !role) {
    return { error: "Nombre, usuario y rol son obligatorios." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== memberId) {
    return { error: "El nombre de usuario ya está en uso." };
  }

  const needsAssociate = ["advisor", "designer"].includes(role);
  const finalAssociateId = needsAssociate ? (salesAssociateId || null) : null;

  const updateData: any = { name, username, role, salesAssociateId: finalAssociateId, activeStatus };
  if (password?.trim()) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: memberId }, data: updateData });

  // Actualizar appliesMsAdjustment en el perfil vinculado si es designer
  if (role === "designer" && salesAssociateId) {
    await prisma.salesAssociate.update({
      where: { id: salesAssociateId },
      data: { appliesMsAdjustment }
    });
  }

  redirect("/equipo");
}
