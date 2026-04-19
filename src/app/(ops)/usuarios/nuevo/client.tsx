"use client";

import { useActionState, useState } from "react";
import { createUserAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const NEW_ASSOCIATE_VALUE = "__new_associate__";

export default function NuevoUsuarioClient({
  salesAssociates,
}: {
  salesAssociates: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return createUserAction(formData);
  }, { error: "" });

  const [selectedRole, setSelectedRole] = useState("advisor");
  const [selectedAssociate, setSelectedAssociate] = useState("");

  const isCreatingNewAssociate = selectedAssociate === NEW_ASSOCIATE_VALUE;

  return (
    <div>
      <div className="mb-6">
        <Link href="/usuarios" className="flex items-center gap-2 text-sm text-[#8E8D8A] hover:text-[#333333] mb-2 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver a usuarios
        </Link>
        <h1 className="text-2xl font-medium text-[#333333] tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
          Nuevo Usuario
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
              <label htmlFor="name" className="block text-sm font-medium text-[#333333] mb-1">Nombre Completo</label>
              <input id="name" name="name" type="text" required className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border" placeholder="Ej. Ana García" />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#333333] mb-1">Nombre de Usuario</label>
              <input id="username" name="username" type="text" required className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border" placeholder="Ej. agarcia" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#333333] mb-1">Contraseña</label>
              <input id="password" name="password" type="password" required className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-[#333333] mb-1">Rol</label>
              <select
                id="role"
                name="role"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setSelectedAssociate("");
                }}
                required
                className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border bg-white"
              >
                <option value="advisor">Asesora</option>
                <option value="manager">Administrador (Manager)</option>
                <option value="certificate_operator">Operador de Certificados</option>
                <option value="stock_operator">Operador de Stock</option>
              </select>
            </div>

            {selectedRole === "advisor" && (
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label htmlFor="salesAssociateId" className="block text-sm font-medium text-[#333333] mb-1">Vincular a Asesora de Ventas</label>
                  <p className="text-xs text-[#8E8D8A] mb-2">Seleccione la asesora que este usuario representará en las operaciones.</p>
                  <select
                    id="salesAssociateId"
                    name="salesAssociateId"
                    required
                    value={selectedAssociate}
                    onChange={(e) => setSelectedAssociate(e.target.value)}
                    className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border bg-white"
                  >
                    <option value="">-- Seleccionar Asesora --</option>
                    {salesAssociates.map((sa) => (
                      <option key={sa.id} value={sa.id}>{sa.name}</option>
                    ))}
                    <option value={NEW_ASSOCIATE_VALUE}>➕ Crear nueva asesora…</option>
                  </select>
                </div>

                {isCreatingNewAssociate && (
                  <div className="bg-[#F5F2EE] border border-[#D8D3CC] rounded-md p-4 space-y-3">
                    <p className="text-xs text-[#8E8D8A]">Se creará una nueva asesora en el catálogo y se vinculará automáticamente a este usuario.</p>
                    <div>
                      <label htmlFor="newAssociateName" className="block text-sm font-medium text-[#333333] mb-1">Nombre de la nueva asesora</label>
                      <input
                        id="newAssociateName"
                        name="newAssociateName"
                        type="text"
                        required
                        placeholder="Ej. Ana García"
                        className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border bg-white"
                      />
                      <p className="text-[10px] text-[#8E8D8A] mt-1">Puede ser igual al nombre del usuario, o distinto si manejan un nombre comercial.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="newAssociateAppliesMsAdjustment"
                        name="newAssociateAppliesMsAdjustment"
                        type="checkbox"
                        className="accent-[#C5B358]"
                      />
                      <label htmlFor="newAssociateAppliesMsAdjustment" className="text-sm text-[#333333] cursor-pointer">
                        Aplica ajuste interno MS (+$5,000 en cotizaciones)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedRole === "stock_operator" && (
              <div className="md:col-span-2">
                <div className="bg-[#F5F2EE] border border-[#D8D3CC] rounded-md p-3 text-xs text-[#8E8D8A]">
                  El operador de stock no cotiza — crea pedidos de stock. Se generará automáticamente una asesora interna vinculada a este usuario.
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Link
              href="/usuarios"
              className="bg-white border border-[#D8D3CC] text-[#333333] px-6 py-2 rounded text-sm hover:bg-[#F5F2EE] transition-colors uppercase tracking-wider font-medium"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#333333] text-white px-6 py-2 rounded text-sm hover:bg-[#222222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-medium"
            >
              {isPending ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
