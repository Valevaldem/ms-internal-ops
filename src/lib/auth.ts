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

export async function getCurrentUser(): Promise<ActiveUser> {
  // --------------------------------------------------------------------------
  // TEMPORARY AUTHENTICATION SWITCH FOR DEVELOPMENT
  // --------------------------------------------------------------------------
  // INSTRUCTIONS TO TEST ROLES:
  //
  // 1. To test as a MANAGER (sees all quotations, dashboard breakdown, etc):
  //    Uncomment line A and comment out blocks B and C.
  //
  // 2. To test as an ADVISOR (only sees their own quotations):
  //    Uncomment block B and comment out line A and line C.
  //    To test a different advisor, change the `where: { name: "..." }` filter.
  //
  // 3. To test as a CERTIFICATE OPERATOR (only sees certificates module):
  //    Uncomment line C and comment out line A and block B.
  //
  // NOTE: You do NOT need to restart the Next.js dev server. Just save this file
  // and refresh the page. Next.js will recompile and reflect the new active user.
  // --------------------------------------------------------------------------

  // --- LINE A: Test as Manager ---
  // return MOCK_MANAGER;

  // --- LINE C: Test as Certificate Operator ---
  // return MOCK_CERT_OPERATOR;

  // --- BLOCK B: Test as Advisor ---
  const advisor = await prisma.salesAssociate.findFirst({
    where: { activeStatus: true }, // e.g. { name: 'MS' } or { name: 'Fernanda Pérez' }
  });

  if (!advisor) {
    // Fallback if no active advisors exist in the DB
    return MOCK_MANAGER;
  }

  return {
    id: `usr-${advisor.id}`,
    name: advisor.name,
    role: "advisor",
    salesAssociateId: advisor.id,
  };
  // --- END BLOCK B ---
}

export function verifyAccess(user: ActiveUser, allowedRoles: UserRole[], redirectTo: string = "/certificados") {
  if (!allowedRoles.includes(user.role)) {
    redirect(redirectTo);
  }
}
