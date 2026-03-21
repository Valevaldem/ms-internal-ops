"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export async function createAsesoraAction(formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const name = formData.get("name") as string;
  const activeStatus = formData.get("activeStatus") === "on";
  const appliesMsAdjustment = formData.get("appliesMsAdjustment") === "on";

  if (!name || name.trim().length === 0) {
    return { error: "El nombre de la asesora es obligatorio." };
  }

  // Create new sales associate
  await prisma.salesAssociate.create({
    data: {
      name: name.trim(),
      activeStatus,
      appliesMsAdjustment,
    },
  });

  redirect("/asesoras");
}
