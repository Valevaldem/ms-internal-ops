"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { createQuotation } from "./actions"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import type { ActiveUser } from "@/lib/auth"

const schema = z.object({
  clientNameOrUsername: z.string().min(1, "Requerido"),
  phoneNumber: z.string().optional(),
  salesChannel: z.enum(["Store", "WhatsApp", "Instagram", "Facebook", "TikTok", "Form"]),
  salesAssociateId: z.string().min(1, "Requerido"),
  pieceType: z.string().min(1, "Requerido"),
  modelId: z.string().min(1, "Requerido"),
  notes: z.string().optional(),
  marginProtectionEnabled: z.boolean().default(false),
  discountPercent: z.number().min(0).max(100).optional(),
  stones: z.array(z.object({
    lotCode: z.string().min(1, "Requerido"),
    stoneName: z.string(),
    quantity: z.number().min(1).default(1),
    weightCt: z.number().min(0.01),
    pricePerCt: z.number(),
    pricingMode: z.string().optional().default("CT"),
    stoneSubtotal: z.number()
  }))
})

export default function NuevaCotizacionClient({ catalogs, initialData, activeUser }: { catalogs: any, initialData?: any, activeUser: ActiveUser }) {
  const router = useRouter()
  const [invalidLots, setInvalidLots] = useState<number[]>([])
  const isAdvisor = activeUser.role === "advisor";

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clientNameOrUsername: initialData?.clientNameOrUsername || "",
      phoneNumber: initialData?.phoneNumber || "",
      salesChannel: initialData?.salesChannel || "Store",
      salesAssociateId: isAdvisor ? activeUser.salesAssociateId : (initialData?.salesAssociateId || ""),
      pieceType: initialData?.pieceType || (catalogs.pieceTypes && catalogs.pieceTypes[0]?.name) || "Ring",
      modelId: initialData?.modelId || "",
      notes: initialData?.notes || "",
      marginProtectionEnabled: initialData?.marginProtectionEnabled || false,
      discountPercent: initialData?.discountPercent || 0,
      stones: initialData?.stones?.map((s: any) => ({
        lotCode: s.lotCode,
        stoneName: s.stoneName,
        quantity: s.quantity || 1,
        weightCt: s.weightCt,
        pricePerCt: s.pricePerCt,
        pricingMode: s.pricingMode || "CT",
        stoneSubtotal: s.stoneSubtotal
      })) || []
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "stones" })

  const modelId = watch("modelId")
  const associateId = watch("salesAssociateId")
  const marginProtectionEnabled = watch("marginProtectionEnabled")
  const discountPercent = watch("discountPercent")
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

  const roundedPriceBeforeDiscount = getRoundedCommercialPrice(rawClientPrice);

  // Applies discount WITHOUT re-rounding
  const calculatedDiscountAmount = (roundedPriceBeforeDiscount * (discountPercent || 0)) / 100;
  const finalClientPrice = roundedPriceBeforeDiscount - calculatedDiscountAmount;

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
      setValue(`stones.${index}.pricingMode`, lot.pricingMode || "CT")

      const weight = watch(`stones.${index}.weightCt`) || 0
      const qty = watch(`stones.${index}.quantity`) || 1
      if (lot.pricingMode === "PZ") {
        setValue(`stones.${index}.stoneSubtotal`, lot.pricePerCt * qty)
      } else {
        setValue(`stones.${index}.stoneSubtotal`, weight * lot.pricePerCt)
      }
    } else {
      setInvalidLots(prev => !prev.includes(index) ? [...prev, index] : prev)
      setValue(`stones.${index}.stoneName`, "")
      setValue(`stones.${index}.pricePerCt`, 0)
      setValue(`stones.${index}.pricingMode`, "CT")
      setValue(`stones.${index}.stoneSubtotal`, 0)
    }
  }

  const handleWeightChange = (index: number, weight: number) => {
    const pricePerCt = watch(`stones.${index}.pricePerCt`) || 0
    const pricingMode = watch(`stones.${index}.pricingMode`) || "CT"
    const qty = watch(`stones.${index}.quantity`) || 1

    if (pricingMode === "PZ") {
      setValue(`stones.${index}.stoneSubtotal`, pricePerCt * qty)
    } else {
      setValue(`stones.${index}.stoneSubtotal`, weight * pricePerCt)
    }
  }

  const handleQuantityChange = (index: number, qty: number) => {
    setValue(`stones.${index}.quantity`, qty)
    const pricePerCt = watch(`stones.${index}.pricePerCt`) || 0
    const pricingMode = watch(`stones.${index}.pricingMode`) || "CT"
    const weight = watch(`stones.${index}.weightCt`) || 0

    if (pricingMode === "PZ") {
      setValue(`stones.${index}.stoneSubtotal`, pricePerCt * qty)
    } else {
      setValue(`stones.${index}.stoneSubtotal`, weight * pricePerCt)
    }
  }

  const onSubmit = async (data: any) => {
    if (initialData?.id) {
      data.versionFromId = initialData.id;
    }
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
      discountPercent: discountPercent || 0,
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
              <input readOnly={!!initialData} {...register("clientNameOrUsername")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} placeholder="Ej. Maria Lopez / @marialopez" />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Teléfono</label>
              <input readOnly={!!initialData} {...register("phoneNumber")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Canal de Venta</label>
              <select {...register("salesChannel")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] pointer-events-none appearance-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} tabIndex={initialData ? -1 : 0}>
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
              <select {...register("salesAssociateId")} className={`w-full border ${(initialData || isAdvisor) ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] pointer-events-none appearance-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} tabIndex={(initialData || isAdvisor) ? -1 : 0}>
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
              <select {...register("pieceType")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] pointer-events-none appearance-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} tabIndex={initialData ? -1 : 0}>
                {catalogs.pieceTypes?.map((pt: any) => (
                  <option key={pt.id} value={pt.name}>{pt.name}</option>
                ))}
                {/* Fallback for existing old records that might not be in catalogs */}
                {initialData && (!catalogs.pieceTypes || !catalogs.pieceTypes.some((pt: any) => pt.name === initialData.pieceType)) && (
                  <option value={initialData.pieceType}>{initialData.pieceType}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Modelo Base</label>
              <select {...register("modelId")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] pointer-events-none appearance-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} tabIndex={initialData ? -1 : 0}>
                <option value="">Selecciona modelo...</option>
                {catalogs.models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#333333] mb-1">Notas del diseño</label>
            <textarea readOnly={!!initialData} {...register("notes")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} rows={2}></textarea>
          </div>
        </section>

        {/* Piedras */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#F5F2EE] pb-2">
            <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold">Piedras</h3>
            <button type="button" onClick={() => append({ lotCode: "", stoneName: "", quantity: 1, weightCt: 0, pricePerCt: 0, pricingMode: "CT", stoneSubtotal: 0 })} className="text-xs text-[#C5B358] hover:text-[#333333] flex items-center gap-1 transition-colors font-medium">
              <Plus size={14} /> Agregar Piedra
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-[#F5F2EE]/30 p-3 rounded-md border border-[#F5F2EE]">
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Lote</label>
                  <input {...register(`stones.${index}.lotCode`)} onBlur={(e) => handleLotCodeChange(index, e.target.value)} className="w-full border border-[#D8D3CC] rounded p-2 text-sm bg-white uppercase" placeholder="Ej: D-001" />
                </div>
                <div className="col-span-3 relative">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Nombre</label>
                  <input disabled {...register(`stones.${index}.stoneName`)} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#8E8D8A]" />
                  {watch(`stones.${index}.pricingMode`) === "PZ" && (
                    <span className="absolute top-1 right-2 text-[9px] bg-[#D8D3CC] text-[#333333] px-1 rounded">Precio por Pieza</span>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1" title="Cantidad de piezas">Cant.</label>
                  <input type="number" min="1" step="1" disabled={watch(`stones.${index}.pricingMode`) !== "PZ"} {...register(`stones.${index}.quantity`, { valueAsNumber: true })} onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)} className={`w-full border ${watch(`stones.${index}.pricingMode`) !== "PZ" ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A]' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-center`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {watch(`stones.${index}.pricingMode`) === "PZ" ? "Peso total (CT)" : "Peso (CT)"} <span className="text-[#C5B358] font-bold" title="Requerido para el certificado">*</span>
                  </label>
                  <input type="number" step="0.01" {...register(`stones.${index}.weightCt`, { valueAsNumber: true })} onChange={(e) => handleWeightChange(index, parseFloat(e.target.value) || 0)} className="w-full border border-[#D8D3CC] rounded p-2 text-sm bg-white" placeholder="0.00" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Subtotal</label>
                  <input disabled value={`$${(watch(`stones.${index}.stoneSubtotal`) || 0).toLocaleString()}`} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-right" title={watch(`stones.${index}.pricingMode`) === "PZ" ? "Precio fijo por pieza. No se multiplica por CT." : "Multiplicado por CT"} />
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
            <label className={`flex items-center gap-2 text-[#333333] font-medium ${initialData ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              <input type="checkbox" disabled={!!initialData} {...register("marginProtectionEnabled")} className="rounded text-[#C5B358] focus:ring-[#C5B358] bg-white border-[#D8D3CC] disabled:opacity-50" />
              {initialData && <input type="hidden" {...register("marginProtectionEnabled")} />}
              Ajuste interno
            </label>
            {marginProtectionEnabled && <span className="text-[#C5B358] font-medium">${marginProtectionAmount.toLocaleString()}</span>}
          </div>

          {discountPercent ? discountPercent > 0 && (
            <div className="flex justify-between text-sm text-red-500 font-medium">
              <span>Descuento Aplicado ({discountPercent}%):</span>
              <span>-${calculatedDiscountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : null}

          <div className="flex justify-between text-lg font-serif pt-4 mt-4 border-t border-[#D8D3CC]">
            <span>Precio Final Cliente:</span>
            <div className="flex flex-col items-end">
              {discountPercent && discountPercent > 0 ? (
                <span className="text-sm line-through text-[#8E8D8A] mb-1">
                  ${roundedPriceBeforeDiscount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              ) : null}
              <span className="text-[#C5B358] font-semibold">${finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D8D3CC] mt-4 flex justify-between items-center">
             <label className="text-sm text-[#333333]">Descuento (%)</label>
             <input readOnly={!!initialData} type="number" step="0.1" min="0" max="100" {...register("discountPercent", { valueAsNumber: true })} className={`w-24 border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-right focus:outline-none focus:border-[#C5B358]`} placeholder="0" />
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
