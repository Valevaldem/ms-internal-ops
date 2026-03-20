"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { UserRole } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Por favor, ingresa tu usuario y contraseña." };
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.activeStatus) {
    return { error: "Credenciales inválidas o cuenta inactiva." };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    return { error: "Credenciales inválidas." };
  }

  const role = user.role as UserRole;
  const redirectUrl = role === "certificate_operator" ? "/certificados" : "/";

  await createSession({
    id: user.id,
    name: user.name,
    role: role,
    salesAssociateId: user.salesAssociateId || undefined,
  });

  redirect(redirectUrl);
}
