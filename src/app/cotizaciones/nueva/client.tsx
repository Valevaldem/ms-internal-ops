"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { createQuotation } from "./actions"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

const schema = z.object({
  clientNameOrUsername: z.string().min(1, "Requerido"),
  phoneNumber: z.string().optional(),
  salesChannel: z.enum(["Store", "WhatsApp", "Instagram", "Facebook", "TikTok", "Form"]),
  salesAssociateId: z.string().min(1, "Requerido"),
  pieceType: z.enum(["Ring", "Chain", "Earrings", "Bracelet", "Other"]),
  modelId: z.string().min(1, "Requerido"),
  notes: z.string().optional(),
  marginProtectionEnabled: z.boolean().default(false),
  stones: z.array(z.object({
    lotCode: z.string().min(1, "Requerido"),
    stoneName: z.string(),
    weightCt: z.number().min(0.01),
    pricePerCt: z.number(),
    stoneSubtotal: z.number()
  }))
})

export default function NuevaCotizacionClient({ catalogs }: { catalogs: any }) {
  const router = useRouter()
  const [invalidLots, setInvalidLots] = useState<number[]>([])

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      salesChannel: "Store",
      pieceType: "Ring",
      marginProtectionEnabled: false,
      stones: []
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "stones" })

  const modelId = watch("modelId")
  const associateId = watch("salesAssociateId")
  const marginProtectionEnabled = watch("marginProtectionEnabled")
  const stones = watch("stones")

  const selectedModel = catalogs.models.find((m: any) => m.id === modelId)
  const selectedAssociate = catalogs.associates.find((a: any) => a.id === associateId)

  // Calculations
  const modelBasePrice = selectedModel?.basePrice || 0
  const totalStonesPrice = stones.reduce((sum, s) => sum + (s.stoneSubtotal || 0), 0)
  const subtotalBeforeAdjustments = totalStonesPrice + modelBasePrice
  const msInternalAdjustment = selectedAssociate?.appliesMsAdjustment ? 5000 : 0

  let baseForMargin = subtotalBeforeAdjustments + msInternalAdjustment
  const marginProtectionAmount = marginProtectionEnabled ? baseForMargin * 0.15 : 0
  const rawClientPrice = baseForMargin + marginProtectionAmount

  // Commercial rounding logic: always round UP to nearest X,000 | X,500 | X,850
  const getRoundedCommercialPrice = (price: number) => {
    if (price === 0) return 0;
    const baseThousand = Math.floor(price / 1000) * 1000;
    const remainder = price - baseThousand;

    if (remainder === 0) return baseThousand;
    if (remainder <= 500) return baseThousand + 500;
    if (remainder <= 850) return baseThousand + 850;
    return baseThousand + 1000;
  };

  const finalClientPrice = getRoundedCommercialPrice(rawClientPrice);

  const handleLotCodeChange = (index: number, code: string) => {
    if (!code) {
      setInvalidLots(prev => prev.filter(i => i !== index))
      setValue(`stones.${index}.stoneName`, "")
      setValue(`stones.${index}.pricePerCt`, 0)
      setValue(`stones.${index}.stoneSubtotal`, 0)
      return
    }

    const lot = catalogs.stones.find((s: any) => s.code.toUpperCase() === code.toUpperCase())
    if (lot) {
      setInvalidLots(prev => prev.filter(i => i !== index))
      setValue(`stones.${index}.lotCode`, lot.code)
      setValue(`stones.${index}.stoneName`, lot.stoneName)
      setValue(`stones.${index}.pricePerCt`, lot.pricePerCt)
      const weight = watch(`stones.${index}.weightCt`) || 0
      setValue(`stones.${index}.stoneSubtotal`, weight * lot.pricePerCt)
    } else {
      setInvalidLots(prev => !prev.includes(index) ? [...prev, index] : prev)
      setValue(`stones.${index}.stoneName`, "")
      setValue(`stones.${index}.pricePerCt`, 0)
      setValue(`stones.${index}.stoneSubtotal`, 0)
    }
  }

  const handleWeightChange = (index: number, weight: number) => {
    const pricePerCt = watch(`stones.${index}.pricePerCt`) || 0
    setValue(`stones.${index}.stoneSubtotal`, weight * pricePerCt)
  }

  const onSubmit = async (data: any) => {
    // Check invalid stones
    if (data.stones.some((s: any) => !s.stoneName) || invalidLots.length > 0) {
      alert("Por favor corrige los lotes inválidos antes de continuar.")
      return
    }

    const payload = {
      ...data,
      associateId: data.salesAssociateId,
      modelName: selectedModel?.name || "Desconocido",
      modelBasePrice,
      totalStonesPrice,
      subtotalBeforeAdjustments,
      msInternalAdjustment,
      marginProtectionAmount,
      finalClientPrice,
      validUntilDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000)
    }

    try {
      await createQuotation(payload)
      router.push("/cotizaciones/historial")
    } catch (e) {
      console.error(e)
      alert("Error al guardar.")
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h2 className="text-2xl font-serif text-[#333333] mb-6">Nueva Cotización</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* Cabecera */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Datos Generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Cliente / Usuario</label>
              <input {...register("clientNameOrUsername")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Nombre o IG..." />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Teléfono</label>
              <input {...register("phoneNumber")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Canal de Venta</label>
              <select {...register("salesChannel")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
                <option value="Store">Tienda Física</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="Form">Formulario Web</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Asesor(a)</label>
              <select {...register("salesAssociateId")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
                <option value="">Selecciona...</option>
                {catalogs.associates.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Pieza */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Información de la Pieza</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Tipo de Pieza</label>
              <select {...register("pieceType")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
                <option value="Ring">Anillo</option>
                <option value="Chain">Cadena</option>
                <option value="Earrings">Aretes</option>
                <option value="Bracelet">Pulsera</option>
                <option value="Other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Modelo Base</label>
              <select {...register("modelId")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
                <option value="">Selecciona modelo...</option>
                {catalogs.models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#333333] mb-1">Notas del diseño</label>
            <textarea {...register("notes")} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2}></textarea>
          </div>
        </section>

        {/* Piedras */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#F5F2EE] pb-2">
            <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold">Piedras</h3>
            <button type="button" onClick={() => append({ lotCode: "", stoneName: "", weightCt: 0, pricePerCt: 0, stoneSubtotal: 0 })} className="text-xs text-[#C5B358] hover:text-[#333333] flex items-center gap-1 transition-colors font-medium">
              <Plus size={14} /> Agregar Piedra
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-[#F5F2EE]/30 p-3 rounded-md border border-[#F5F2EE]">
                <div className="col-span-3">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Lote</label>
                  <input {...register(`stones.${index}.lotCode`)} onBlur={(e) => handleLotCodeChange(index, e.target.value)} className="w-full border border-[#D8D3CC] rounded p-2 text-sm bg-white uppercase" placeholder="Ej: D-001" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Nombre</label>
                  <input disabled {...register(`stones.${index}.stoneName`)} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#8E8D8A]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Peso (ct)</label>
                  <input type="number" step="0.01" {...register(`stones.${index}.weightCt`, { valueAsNumber: true })} onChange={(e) => handleWeightChange(index, parseFloat(e.target.value) || 0)} className="w-full border border-[#D8D3CC] rounded p-2 text-sm bg-white" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Subtotal</label>
                  <input disabled value={`$${(watch(`stones.${index}.stoneSubtotal`) || 0).toLocaleString()}`} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-right" />
                </div>
                <div className="col-span-1 flex justify-end pb-2">
                  <button type="button" onClick={() => {
                    remove(index)
                    setInvalidLots(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
                  }} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                {invalidLots.includes(index) && (
                  <div className="col-span-12">
                    <span className="text-xs text-red-500 mt-1 block">Lote de piedra inválido o no encontrado.</span>
                  </div>
                )}
              </div>
            ))}
            {fields.length === 0 && <p className="text-sm text-center text-[#8E8D8A] py-4">No hay piedras agregadas.</p>}
          </div>
        </section>

        {/* Precios (Interno) */}
        <section className="bg-[#F5F2EE]/50 border border-[#D8D3CC] text-[#333333] p-6 rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#D8D3CC] pb-2 mb-4">Desglose (Uso Interno)</h3>

          <div className="flex justify-between text-sm">
            <span className="text-[#8E8D8A]">Base del Modelo:</span>
            <span>${modelBasePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8E8D8A]">Subtotal Piedras:</span>
            <span>${totalStonesPrice.toLocaleString()}</span>
          </div>

          {msInternalAdjustment > 0 && (
            <div className="flex justify-between text-sm text-[#C5B358] font-medium">
              <span>Ajuste MS (+):</span>
              <span>${msInternalAdjustment.toLocaleString()}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2 border-t border-[#D8D3CC] mt-2">
            <label className="flex items-center gap-2 text-[#333333] cursor-pointer font-medium">
              <input type="checkbox" {...register("marginProtectionEnabled")} className="rounded text-[#C5B358] focus:ring-[#C5B358] bg-white border-[#D8D3CC]" />
              Ajuste interno
            </label>
            {marginProtectionEnabled && <span className="text-[#C5B358] font-medium">${marginProtectionAmount.toLocaleString()}</span>}
          </div>

          <div className="flex justify-between text-lg font-serif pt-4 mt-4 border-t border-[#D8D3CC]">
            <span>Precio Final Cliente:</span>
            <span className="text-[#C5B358] font-semibold">${finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSubmitting} className="bg-[#333333] hover:bg-black text-white px-8 py-3 rounded-md text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50">
            {isSubmitting ? "Guardando..." : "Crear Cotización"}
          </button>
        </div>

      </form>
    </div>
  )
}
