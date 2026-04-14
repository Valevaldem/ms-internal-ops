"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createManualQuotation } from "./actions"
import { useRouter } from "next/navigation"
import type { ActiveUser } from "@/lib/auth"

const schema = z.object({
  clientNameOrUsername: z.string().min(1, "Requerido"),
  phoneNumber: z.string().optional(),
  salesChannel: z.enum(["Store", "WhatsApp", "Instagram", "Facebook", "TikTok", "Form"]),
  salesAssociateId: z.string().min(1, "Requerido"),
  pieceType: z.string().min(1, "Requerido"),
  manualPieceDescription: z.string().min(1, "Requerido"),
  productionTiming: z.enum(["Express", "Regular", "Special"]),
  finalClientPrice: z.number().min(0, "Debe ser mayor o igual a 0"),
  notes: z.string().optional(),
})

export default function NuevaCotizacionManualClient({ catalogs, activeUser }: { catalogs: any, activeUser: ActiveUser }) {
  const router = useRouter()
  const isAdvisor = activeUser.role === "advisor";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clientNameOrUsername: "",
      phoneNumber: "",
      salesChannel: "Store",
      salesAssociateId: isAdvisor ? activeUser.salesAssociateId : "",
      pieceType: (catalogs.pieceTypes && catalogs.pieceTypes[0]?.name) || "Ring",
      manualPieceDescription: "",
      productionTiming: "Regular" as const,
      finalClientPrice: 0,
      notes: "",
    }
  })

  const buildPayload = (data: any, asDraft: boolean) => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 15);
    return { ...data, associateId: data.salesAssociateId, validUntilDate, asDraft };
  };

  const onSubmit = async (data: any) => {
    const res = await createManualQuotation(buildPayload(data, false));
    if (res?.id) router.push(`/cotizaciones/${res.id}`);
  }

  const onSaveDraft = async (data: any) => {
    const res = await createManualQuotation(buildPayload(data, true));
    if (res?.id) router.push(`/cotizaciones/${res.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8 border-b border-[#D8D3CC] pb-4">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Nueva Cotización Manual</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Registro de cotización fuera de modelo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Datos Generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Cliente / Usuario <span className="text-red-500">*</span></label>
              <input {...register("clientNameOrUsername")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Ej. Maria Lopez" />
              {errors.clientNameOrUsername && <span className="text-xs text-red-500">{errors.clientNameOrUsername.message as string}</span>}
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Teléfono</label>
              <input {...register("phoneNumber")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Opcional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Canal de Venta</label>
              <select {...register("salesChannel")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                <option value="Store">Tienda</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="Form">Formulario</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Asesora</label>
              {isAdvisor ? (
                <input disabled value={activeUser.name || ''} className="w-full border border-transparent bg-[#F5F2EE] text-[#8E8D8A] rounded p-2 text-sm cursor-not-allowed" />
              ) : (
                <select {...register("salesAssociateId")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                  <option value="">Selecciona asesora</option>
                  {catalogs.associates.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Pieza</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Tipo de Pieza</label>
              <select {...register("pieceType")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                {catalogs.pieceTypes?.map((pt: any) => (
                  <option key={pt.id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Tiempo de Producción</label>
              <select {...register("productionTiming")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                <option value="Regular">Regular (20 días)</option>
                <option value="Express">Express (5 días)</option>
                <option value="Special">Especial (+50 días)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#333333] mb-1">Descripción de la Pieza <span className="text-red-500">*</span></label>
            <textarea {...register("manualPieceDescription")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} placeholder="Describe el diseño, material, medidas, etc." />
            {errors.manualPieceDescription && <span className="text-xs text-red-500">{errors.manualPieceDescription.message as string}</span>}
          </div>
          <div>
            <label className="block text-sm text-[#333333] mb-1">Notas adicionales</label>
            <textarea {...register("notes")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} />
          </div>
        </section>

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Total Manual</h3>
          <div className="w-1/2">
            <label className="block text-sm text-[#333333] mb-1">Precio Final Cliente ($) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" {...register("finalClientPrice", { valueAsNumber: true })} className="w-full border border-[#D8D3CC] rounded p-2 text-lg text-[#C5B358] font-bold focus:outline-none focus:border-[#C5B358]" placeholder="0.00" />
            {errors.finalClientPrice && <span className="text-xs text-red-500">{errors.finalClientPrice.message as string}</span>}
            <p className="text-xs text-[#8E8D8A] mt-1">Este precio no aplicará redondeo comercial ni descuentos automáticos.</p>
          </div>
        </section>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onSaveDraft)}
            className="bg-white border border-[#D8D3CC] text-[#8E8D8A] hover:bg-[#F5F2EE] hover:text-[#333333] px-6 py-3 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#333333] hover:bg-black text-white px-8 py-3 rounded-md text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Crear Cotización Manual"}
          </button>
        </div>

      </form>
    </div>
  )
}
