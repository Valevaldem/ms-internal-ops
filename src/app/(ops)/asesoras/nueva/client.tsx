"use client";

import { useActionState } from "react";
import { createAsesoraAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CrearAsesoraClient() {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return createAsesoraAction(formData);
  }, { error: "" });

  return (
    <div>
      <div className="mb-6">
        <Link href="/asesoras" className="flex items-center gap-2 text-sm text-[#8E8D8A] hover:text-[#333333] mb-2 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver a asesoras
        </Link>
        <h1 className="text-2xl font-medium text-[#333333] tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
          Crear Nueva Asesora
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
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-[#333333] mb-1">
                Nombre de la Asesora
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full border-[#D8D3CC] rounded-md py-2 px-3 focus:ring-[#C5B358] focus:border-[#C5B358] sm:text-sm border"
                placeholder="Ej. Maria Salinas"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="activeStatus" className="block text-sm font-medium text-[#333333] mb-1">
                Estado Comercial
              </label>
              <div className="mt-2 flex items-center">
                <input
                  id="activeStatus"
                  name="activeStatus"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-[#C5B358] focus:ring-[#C5B358] border-gray-300 rounded"
                />
                <label htmlFor="activeStatus" className="ml-2 block text-sm text-[#555555]">
                  Asesora Activa
                </label>
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-[#EAE5DF]">
              <label htmlFor="appliesMsAdjustment" className="block text-sm font-medium text-[#333333] mb-1">
                Ajuste Maria Salinas
              </label>
              <p className="text-xs text-[#8E8D8A] mb-3">
                Si esta asesora aplica el ajuste comercial "MS" en las cotizaciones (solo para Maria Salinas o directores especiales).
              </p>
              <div className="flex items-center">
                <input
                  id="appliesMsAdjustment"
                  name="appliesMsAdjustment"
                  type="checkbox"
                  className="h-4 w-4 text-[#C5B358] focus:ring-[#C5B358] border-gray-300 rounded"
                />
                <label htmlFor="appliesMsAdjustment" className="ml-2 block text-sm text-[#555555]">
                  Aplicar Ajuste MS
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#333333] text-white px-6 py-2 rounded text-sm hover:bg-[#222222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-medium"
            >
              {isPending ? "Creando..." : "Crear Asesora"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
