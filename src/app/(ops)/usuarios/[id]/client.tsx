"use client";

import { useActionState, useState } from "react";
import { updateUserAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type UserData = {
  id: string;
  name: string;
  username: string;
  role: string;
  activeStatus: boolean;
  salesAssociateId: string | null;
};

export default function EditarUsuarioClient({
  user,
  salesAssociates,
}: {
  user: UserData;
  salesAssociates: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return updateUserAction(user.id, formData);
  }, { error: "" });

  const [selectedRole, setSelectedRole] = useState(user.role);

  return (
    <div>
      <div className="mb-6">
        <Link href="/usuarios" className="flex items-center gap-2 text-sm text-[#8E8D8A] hover:text-[#333333] mb-2 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver a usuarios
        </Link>
        <h1 className="text-2xl font-medium text-[#333333] tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
          Editar Usuario: {user.name}
        </h1>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-md p-6 max-w-2xl">
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#333333] mb-1">
                Nombre Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={user.name}
                required
                className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#333333] mb-1">
                Nombre de Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={user.username}
                required
                className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-[#333333] mb-1">
                Rol
              </label>
              <select
                id="role"
                name="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
                className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border bg-white"
              >
                <option value="advisor">Asesora (Advisor)</option>
                <option value="manager">Administrador (Manager)</option>
                <option value="certificate_operator">Operador de Certificados</option>
              </select>
            </div>

            <div>
              <label htmlFor="activeStatus" className="block text-sm font-medium text-[#333333] mb-1">
                Estado de la Cuenta
              </label>
              <div className="mt-2 flex items-center">
                <input
                  id="activeStatus"
                  name="activeStatus"
                  type="checkbox"
                  defaultChecked={user.activeStatus}
                  className="h-4 w-4 text-[#C5B358] focus:ring-[#C5B358] border-gray-300 rounded"
                />
                <label htmlFor="activeStatus" className="ml-2 block text-sm text-[#555555]">
                  Usuario Activo
                </label>
              </div>
            </div>

            {selectedRole === "advisor" && (
              <div className="md:col-span-2">
                <label htmlFor="salesAssociateId" className="block text-sm font-medium text-[#333333] mb-1">
                  Vincular a Asesora de Ventas
                </label>
                <p className="text-xs text-[#8E8D8A] mb-2">
                  Seleccione la asesora que este usuario representará.
                </p>
                <select
                  id="salesAssociateId"
                  name="salesAssociateId"
                  defaultValue={user.salesAssociateId || ""}
                  required
                  className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border bg-white"
                >
                  <option value="">-- Seleccionar Asesora --</option>
                  {salesAssociates.map((sa) => (
                    <option key={sa.id} value={sa.id}>
                      {sa.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2 pt-4 border-t border-[#D8D3CC]">
              <label htmlFor="password" className="block text-sm font-medium text-[#333333] mb-1">
                Cambiar Contraseña <span className="text-[#8E8D8A] font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-[#8E8D8A] mb-2">
                Deja este campo en blanco para conservar la contraseña actual.
              </p>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full md:w-1/2 border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border"
                placeholder="Nueva contraseña"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#333333] text-white px-6 py-2 rounded text-sm hover:bg-[#222222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-medium"
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
