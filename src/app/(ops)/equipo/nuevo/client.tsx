"use client";

import { useActionState, useState } from "react";
import { createMemberAction } from "./actions";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager", desc: "Acceso completo — administra todo" },
  { value: "designer", label: "Diseñadora", desc: "Ve todo, cotiza con ajuste MS de diseño" },
  { value: "advisor", label: "Asesora", desc: "Cotiza y gestiona sus propias órdenes" },
  { value: "stock_operator", label: "Stock", desc: "Registra piezas de stock" },
  { value: "certificate_operator", label: "Certificadora", desc: "Opera certificados físicos" },
  { value: "viewer", label: "Viewer", desc: "Solo lectura — ve todo sin modificar" },
];

const NEEDS_ASSOCIATE = ["advisor", "designer"];
const NEW_ASSOCIATE_VALUE = "__new_associate__";

export default function NuevoMiembroClient({
  salesAssociates,
}: {
  salesAssociates: { id: string; name: string; appliesMsAdjustment: boolean }[];
}) {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return createMemberAction(formData);
  }, { error: "" });

  const [selectedRole, setSelectedRole] = useState("advisor");
  const [applyMs, setApplyMs] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState("");
  const needsAssociate = NEEDS_ASSOCIATE.includes(selectedRole);
  const isCreatingNewAssociate = selectedAssociate === NEW_ASSOCIATE_VALUE;

  return (
    <div>
      <div className="mb-6">
        <Link href="/equipo" className="flex items-center gap-2 text-sm text-[#8E8D8A] hover:text-[#333333] mb-2 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al equipo
        </Link>
        <h1 className="text-2xl font-medium text-[#333333] tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
          Nueva Persona
        </h1>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg p-6 max-w-2xl shadow-sm">
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">{state.error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Nombre Completo</label>
              <input name="name" type="text" required placeholder="Ej. Dennise Fonseca"
                className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Usuario</label>
              <input name="username" type="text" required placeholder="Ej. dennisefonseca"
                className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Contraseña</label>
              <input name="password" type="password" required
                className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Rol</label>
              <select
                name="role"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setApplyMs(false);
                  setSelectedAssociate("");
                }}
                className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358] bg-white"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-[#8E8D8A] mt-1">
                {ROLE_OPTIONS.find(r => r.value === selectedRole)?.desc}
              </p>
            </div>
          </div>

          {needsAssociate && (
            <div className="border-t border-[#F5F2EE] pt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-1">Perfil de ventas vinculado</label>
                <p className="text-xs text-[#8E8D8A] mb-2">Define qué cotizaciones y órdenes puede ver esta persona.</p>
                <select
                  name="salesAssociateId"
                  required
                  value={selectedAssociate}
                  onChange={(e) => setSelectedAssociate(e.target.value)}
                  className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358] bg-white"
                >
                  <option value="">— Seleccionar perfil —</option>
                  {salesAssociates.map(sa => (
                    <option key={sa.id} value={sa.id}>{sa.name}</option>
                  ))}
                  <option value={NEW_ASSOCIATE_VALUE}>➕ Crear nuevo perfil de ventas…</option>
                </select>
              </div>

              {isCreatingNewAssociate && (
                <div className="bg-[#F5F2EE] border border-[#D8D3CC] rounded-md p-4 space-y-3">
                  <p className="text-xs text-[#8E8D8A]">Se creará un nuevo perfil en el catálogo de ventas y se vinculará a esta persona automáticamente.</p>
                  <div>
                    <label htmlFor="newAssociateName" className="block text-sm font-medium text-[#333333] mb-1">Nombre del nuevo perfil de ventas</label>
                    <input
                      id="newAssociateName"
                      name="newAssociateName"
                      type="text"
                      required
                      placeholder="Ej. Dennise Fonseca"
                      className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358] bg-white"
                    />
                    <p className="text-[10px] text-[#8E8D8A] mt-1">Suele ser igual al nombre de la persona. Puede modificarse después en el equipo.</p>
                  </div>
                  {selectedRole !== "designer" && (
                    <div className="flex items-center gap-2">
                      <input
                        id="newAssociateAppliesMsAdjustment"
                        name="newAssociateAppliesMsAdjustment"
                        type="checkbox"
                        className="accent-[#C5B358]"
                      />
                      <label htmlFor="newAssociateAppliesMsAdjustment" className="text-sm text-[#333333] cursor-pointer">
                        Aplica ajuste MS (+$5,000 en cotizaciones)
                      </label>
                    </div>
                  )}
                </div>
              )}

              {selectedRole === "designer" && (
                <div className="flex items-start gap-3 bg-[#FFF9EC] border border-[#C5B358]/30 rounded-lg p-3">
                  <Info size={16} className="text-[#C5B358] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#333333] mb-1">Ajuste MS de diseño</p>
                    <p className="text-xs text-[#8E8D8A] mb-2">Aplica +$5,000 automático a cotizaciones por honorarios de diseño. Se puede omitir por cotización.</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="appliesMsAdjustment" checked={applyMs} onChange={e => setApplyMs(e.target.checked)}
                        className="h-4 w-4 text-[#C5B358] border-[#D8D3CC] rounded focus:ring-[#C5B358]" />
                      <span className="text-sm text-[#333333]">Activar ajuste MS para esta persona</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedRole === "stock_operator" && (
            <div className="bg-[#F5F2EE] border border-[#D8D3CC] rounded-md p-3 text-xs text-[#8E8D8A]">
              El operador de stock no cotiza — crea pedidos de stock. Se generará automáticamente un perfil interno vinculado.
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Link
              href="/equipo"
              className="bg-white border border-[#D8D3CC] text-[#333333] px-6 py-2 rounded text-sm hover:bg-[#F5F2EE] transition-colors uppercase tracking-wider font-medium"
            >
              Cancelar
            </Link>
            <button type="submit" disabled={isPending}
              className="bg-[#333333] text-white px-6 py-2 rounded text-sm hover:bg-[#222222] transition-colors disabled:opacity-50 uppercase tracking-wider font-medium">
              {isPending ? "Guardando..." : "Crear Persona"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
