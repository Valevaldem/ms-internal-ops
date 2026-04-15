import prisma from "./prisma";

export type UserRole = "advisor" | "manager" | "designer" | "certificate_operator" | "stock_operator" | "viewer";

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

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    manager: "Manager",
    designer: "Diseñadora",
    advisor: "Asesora",
    stock_operator: "Stock",
    certificate_operator: "Certificadora",
    viewer: "Viewer",
  };
  return labels[role] || role;
}

export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    manager: "Acceso completo — administra usuarios, inventario y operaciones",
    designer: "Ve todo y cotiza — aplica ajuste MS de diseño",
    advisor: "Cotiza y gestiona sus propias órdenes y certificados",
    stock_operator: "Registra piezas de stock para producción",
    certificate_operator: "Opera certificados físicos únicamente",
    viewer: "Acceso de solo lectura — ve todo sin modificar",
  };
  return descriptions[role] || "";
}
