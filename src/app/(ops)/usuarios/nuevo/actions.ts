"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

const NEW_ASSOCIATE_VALUE = "__new_associate__";

export async function createUserAction(formData: FormData) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const name = (formData.get("name") as string | null)?.trim() || "";
  const username = (formData.get("username") as string | null)?.trim() || "";
  const password = (formData.get("password") as string | null) || "";
  const role = (formData.get("role") as string | null) || "";
  const salesAssociateId = (formData.get("salesAssociateId") as string | null) || "";
  const newAssociateName = (formData.get("newAssociateName") as string | null)?.trim() || "";
  const newAssociateAppliesMsAdjustment = formData.get("newAssociateAppliesMsAdjustment") === "on";

  if (!name || !username || !password || !role) {
    return { error: "Todos los campos son obligatorios." };
  }

  if (role === "advisor" && !salesAssociateId) {
    return { error: "Debe seleccionar (o crear) una asesora de ventas." };
  }

  if (role === "advisor" && salesAssociateId === NEW_ASSOCIATE_VALUE && !newAssociateName) {
    return { error: "Debe proporcionar el nombre de la nueva asesora." };
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    return { error: "El nombre de usuario ya está en uso." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let finalAssociateId: string | null = null;

  if (role === "advisor") {
    if (salesAssociateId === NEW_ASSOCIATE_VALUE) {
      // Crear nueva asesora inline y vincularla
      const newAssociate = await prisma.salesAssociate.create({
        data: {
          name: newAssociateName,
          activeStatus: true,
          appliesMsAdjustment: newAssociateAppliesMsAdjustment,
        },
      });
      finalAssociateId = newAssociate.id;
    } else {
      finalAssociateId = salesAssociateId;
    }
  } else if (role === "stock_operator") {
    // Para stock_operator siempre crear un SalesAssociate interno vinculado
    const stockAssociate = await prisma.salesAssociate.create({
      data: {
        name: `[Stock] ${name}`,
        activeStatus: true,
        appliesMsAdjustment: false,
      },
    });
    finalAssociateId = stockAssociate.id;
  }

  await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role,
      salesAssociateId: finalAssociateId,
      activeStatus: true,
    },
  });

  redirect("/usuarios");
}
