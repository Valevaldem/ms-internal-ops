"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export async function updateUserAction(userId: string, formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const role = formData.get("role") as string;
  const salesAssociateId = formData.get("salesAssociateId") as string;
  const activeStatus = formData.get("activeStatus") === "on";
  const password = formData.get("password") as string;

  if (!name || !username || !role) {
    return { error: "Nombre, usuario y rol son obligatorios." };
  }

  if (role === "advisor" && !salesAssociateId) {
    return { error: "Debe seleccionar una asesora de ventas para este rol." };
  }

  // Check if username already exists for a DIFFERENT user
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser && existingUser.id !== userId) {
    return { error: "El nombre de usuario ya está en uso por otro usuario." };
  }

  const updateData: any = {
    name,
    username,
    role,
    salesAssociateId: role === "advisor" ? salesAssociateId : null,
    activeStatus,
  };

  // Only update password if provided
  if (password && password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  redirect("/usuarios");
}
