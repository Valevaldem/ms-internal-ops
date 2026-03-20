"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export async function createUserAction(formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const salesAssociateId = formData.get("salesAssociateId") as string;

  if (!name || !username || !password || !role) {
    return { error: "Todos los campos son obligatorios." };
  }

  if (role === "advisor" && !salesAssociateId) {
    return { error: "Debe seleccionar una asesora de ventas para este rol." };
  }

  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return { error: "El nombre de usuario ya está en uso." };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role,
      salesAssociateId: role === "advisor" ? salesAssociateId : null,
      activeStatus: true,
    },
  });

  redirect("/usuarios");
}
