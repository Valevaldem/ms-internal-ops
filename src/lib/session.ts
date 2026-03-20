import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ActiveUser } from "./auth";

const secretKey = process.env.SESSION_SECRET || "fallback-secret-key-for-dev";
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(user: ActiveUser) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const sessionData = {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      salesAssociateId: user.salesAssociateId,
    },
  };

  const session = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession(): Promise<{ user: ActiveUser } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as { user: ActiveUser };
  } catch (error) {
    console.error("Failed to verify session", error);
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
