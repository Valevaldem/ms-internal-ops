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
  const needsAssociate = NEEDS_ASSOCIATE.includes(selectedRole);

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
              <select name="role" value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setApplyMs(false); }}
                className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
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
                <select name="salesAssociateId" required
                  className="w-full border border-[#D8D3CC] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
                  <option value="">— Seleccionar perfil —</option>
                  {salesAssociates.map(sa => (
                    <option key={sa.id} value={sa.id}>{sa.name}</option>
                  ))}
                </select>
              </div>

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

          <div className="pt-4 flex justify-end">
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
