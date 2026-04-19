"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

const NEW_ASSOCIATE_VALUE = "__new_associate__";

export async function createMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "designer"]);

  const name = (formData.get("name") as string | null)?.trim() || "";
  const username = (formData.get("username") as string | null)?.trim() || "";
  const password = (formData.get("password") as string | null) || "";
  const role = (formData.get("role") as string | null) || "";
  const salesAssociateId = (formData.get("salesAssociateId") as string | null) || "";
  const appliesMsAdjustment = formData.get("appliesMsAdjustment") === "on";
  const newAssociateName = (formData.get("newAssociateName") as string | null)?.trim() || "";
  const newAssociateAppliesMsAdjustment = formData.get("newAssociateAppliesMsAdjustment") === "on";

  if (!name || !username || !password || !role) {
    return { error: "Todos los campos son obligatorios." };
  }

  const needsAssociate = ["advisor", "designer"].includes(role);
  if (needsAssociate && !salesAssociateId) {
    return { error: "Este rol requiere un perfil de ventas vinculado." };
  }

  if (needsAssociate && salesAssociateId === NEW_ASSOCIATE_VALUE && !newAssociateName) {
    return { error: "Debe proporcionar el nombre del nuevo perfil de ventas." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "El nombre de usuario ya está en uso." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let finalAssociateId: string | null = null;

  if (needsAssociate) {
    if (salesAssociateId === NEW_ASSOCIATE_VALUE) {
      // Crear perfil nuevo inline
      const newAssoc = await prisma.salesAssociate.create({
        data: {
          name: newAssociateName,
          activeStatus: true,
          // Si es designer usamos el toggle dedicado appliesMsAdjustment; si no, el checkbox del bloque de crear-nuevo
          appliesMsAdjustment: role === "designer" ? appliesMsAdjustment : newAssociateAppliesMsAdjustment,
        },
      });
      finalAssociateId = newAssoc.id;
    } else {
      finalAssociateId = salesAssociateId;
      // Actualizar appliesMsAdjustment para designer si vinculó uno existente
      if (role === "designer") {
        await prisma.salesAssociate.update({
          where: { id: salesAssociateId },
          data: { appliesMsAdjustment },
        });
      }
    }
  } else if (role === "stock_operator") {
    const stockAssoc = await prisma.salesAssociate.create({
      data: { name: `[STOCK] ${name}`, activeStatus: true, appliesMsAdjustment: false },
    });
    finalAssociateId = stockAssoc.id;
  }

  await prisma.user.create({
    data: { name, username, passwordHash, role, salesAssociateId: finalAssociateId, activeStatus: true },
  });

  redirect("/equipo");
}
