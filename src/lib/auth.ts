import prisma from "./prisma";

// Temporary centralized auth context for development phase
// This will eventually be replaced by a real authentication system (e.g. NextAuth)

export type UserRole = "advisor" | "manager" | "certificate_operator";

export interface ActiveUser {
  id: string; // The user's actual ID (could be from a User table later)
  name: string;
  role: UserRole;
  salesAssociateId?: string; // If advisor, their associated SalesAssociate ID
}

// Temporary Mock Users
const MOCK_MANAGER: ActiveUser = {
  id: "mgr-1",
  name: "Manager",
  role: "manager",
};

const MOCK_CERT_OPERATOR: ActiveUser = {
  id: "cert-1",
  name: "Operador de Certificados",
  role: "certificate_operator",
};

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

export function verifyAccess(user: ActiveUser, allowedRoles: UserRole[], redirectTo: string = "/certificados") {
  if (!allowedRoles.includes(user.role)) {
    redirect(redirectTo);
  }
}
