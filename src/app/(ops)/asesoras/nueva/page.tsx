import { getCurrentUser, verifyAccess } from "@/lib/auth";
import CrearAsesoraClient from "./client";

export default async function NuevaAsesoraPage() {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  return <CrearAsesoraClient />;
}
