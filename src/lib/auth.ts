import prisma from "./prisma";

// Temporary centralized auth context for development phase
// This will eventually be replaced by a real authentication system (e.g. NextAuth)

export type UserRole = "advisor" | "manager";

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

export async function getCurrentUser(): Promise<ActiveUser> {
  // In a real app, this would read from cookies/session

  // To test as Manager:
  // return MOCK_MANAGER;

  // To test as Advisor, fetch a real SalesAssociate from the DB
  const advisor = await prisma.salesAssociate.findFirst({
    where: { activeStatus: true }, // e.g., 'MS' or 'Fernanda Pérez'
  });

  if (!advisor) {
    // Fallback if no advisors exist
    return MOCK_MANAGER;
  }

  return {
    id: `usr-${advisor.id}`,
    name: advisor.name,
    role: "advisor",
    salesAssociateId: advisor.id,
  };
}
