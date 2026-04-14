import prisma from "./prisma";

export type UserRole = "advisor" | "manager" | "certificate_operator" | "stock_operator";

export interface ActiveUser {
  id: string;
  name: string;
  role: UserRole;
  salesAssociateId?: string;
}

import { redirect } from "next/navigation";
import { verifySession, deleteSession } from "./session";

export async function getCurrentUser(): Promise<ActiveUser> {
  const session = await verifySession();
  if (!session || !session.user) {
    redirect("/login");
  }
  return session.user;
}

export async function logout() {
  "use server";
  await deleteSession();
  redirect("/login");
}

export function verifyAccess(
  user: ActiveUser,
  allowedRoles: UserRole[],
  redirectTo: string = "/certificados"
) {
  if (!allowedRoles.includes(user.role)) {
    redirect(redirectTo);
  }
}
