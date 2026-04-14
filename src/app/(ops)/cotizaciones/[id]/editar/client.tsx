"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { updateQuotation, updateManualQuotation } from "./actions"
import type { ActiveUser } from "@/lib/auth"

export default function EditCotizacionClient({
  quotationId,
  catalogs,
  initialData,
  activeUser,
  isManual,
}: {
  quotationId: string
  catalogs: any
  initialData: any
  activeUser: ActiveUser
  isManual: boolean
}) {
  const router = useRouter()
  const [invalidLots, setInvalidLots] = useState<number[]>([])
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>(
    initialData.discountPercent > 0 ? 'percent' : 'percent'
  )
  const [discountAmountInput, setDiscountAmountInput] = useState<number>(0)
  const [quantityStrings, setQuantityStrings] = useState<Record<number, string>>({})
  const [weightStrings, setWeightStrings] = useState<Record<number, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      clientNameOrUsername: initialData.clientNameOrUsername || "",
      phoneNumber: initialData.phoneNumber || "",
      salesChannel: initialData.salesChannel || "Store",
      pieceType: initialData.pieceType || "",
      modelId: initialData.modelId || "",
      modelBasePrice: initialData.modelBasePrice || 0,
      notes: initialData.notes || "",
      marginProtectionEnabled: initialData.marginProtectionEnabled || false,
      discountPercent: initialData.discountPercent || 0,
      // Manual fields
      manualPieceDescription: initialData.manualPieceDescription || "",
      productionTiming: initialData.productionTiming || "Regular",
      finalClientPrice: initialData.finalClientPrice || 0,
      stones: initialData.stones || [],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "stones" })

  const modelId = watch("modelId")
  const marginProtectionEnabled = watch("marginProtectionEnabled")
  const discountPercent = watch("discountPercent")
  const stones = watch("stones")
  const pieceType = watch("pieceType")
  const manualBasePrice = watch("modelBasePrice")
  const finalClientPriceManual = watch("finalClientPrice")

  const selectedModel = catalogs.models.find((m: any) => m.id === modelId)
  const selectedAssociate = catalogs.associates.find((a: any) => a.id === initialData.salesAssociateId)
  const selectedPieceTypeObj = catalogs.pieceTypes?.find((pt: any) => pt.name === pieceType)
  const filteredModels = catalogs.models.filter((m: any) => m.pieceTypeId === selectedPieceTypeObj?.id)

  // Cálculos precio estándar
  const modelBasePrice = activeUser.role === 'manager' && manualBasePrice !== undefined
    ? manualBasePrice : (selectedModel?.basePrice || initialData.modelBasePrice || 0)
  const totalStonesPrice = stones.reduce((sum: number, s: any) => sum + (s.stoneSubtotal || 0), 0)
  const subtotalBeforeAdjustments = totalStonesPrice + modelBasePrice
  const msInternalAdjustment = selectedAssociate?.appliesMsAdjustment ? 5000 : 0
  const baseForMargin = subtotalBeforeAdjustments + msInternalAdjustment
  const marginProtectionAmount = marginProtectionEnabled ? baseForMargin * 0.15 : 0
  const rawClientPrice = baseForMargin + marginProtectionAmount

  const getRounded = (price: number) => {
    if (price === 0) return 0
    const base = Math.floor(price / 1000) * 1000, rem = price - base
    if (rem === 0) return base
    if (rem <= 500) return base + 500
    if (rem <= 850) return base + 850
    return base + 1000
  }
  const roundedPriceBeforeDiscount = getRounded(rawClientPrice)

  let effectiveDiscountPercent = 0, effectiveDiscountAmount = 0
  if (discountMode === 'percent') {
    effectiveDiscountPercent = discountPercent || 0
    effectiveDiscountAmount = (roundedPriceBeforeDiscount * effectiveDiscountPercent) / 100
  } else {
    effectiveDiscountAmount = discountAmountInput || 0
    effectiveDiscountPercent = roundedPriceBeforeDiscount > 0 ? (effectiveDiscountAmount / roundedPriceBeforeDiscount) * 100 : 0
  }
  const finalClientPrice = isManual ? finalClientPriceManual : (roundedPriceBeforeDiscount - effectiveDiscountAmount)

  const handleDiscountModeToggle = (mode: 'percent' | 'amount') => {
    setDiscountMode(mode)
    if (mode === 'percent') setValue('discountPercent', roundedPriceBeforeDiscount > 0 ? Math.round((discountAmountInput / roundedPriceBeforeDiscount) * 1000) / 10 : 0)
    else setDiscountAmountInput(Math.round((roundedPriceBeforeDiscount * (discountPercent || 0)) / 100))
  }

  const handleLotCodeChange = (index: number, code: string) => {
    if (!code) { setInvalidLots(p => p.filter(i => i !== index)); setValue(`stones.${index}.stoneName`, ""); setValue(`stones.${index}.pricePerCt`, 0); setValue(`stones.${index}.stoneSubtotal`, 0); return }
    const lot = catalogs.stones.find((s: any) => s.code.toUpperCase() === code.toUpperCase())
    if (lot) {
      setInvalidLots(p => p.filter(i => i !== index))
      setValue(`stones.${index}.lotCode`, lot.code); setValue(`stones.${index}.stoneName`, lot.stoneName)
      setValue(`stones.${index}.pricePerCt`, lot.pricePerCt); setValue(`stones.${index}.pricingMode`, lot.pricingMode || "CT")
      const w = watch(`stones.${index}.weightCt`) || 0, q = watch(`stones.${index}.quantity`) || 1
      setValue(`stones.${index}.stoneSubtotal`, lot.pricingMode === "PZ" ? lot.pricePerCt * q : w * lot.pricePerCt)
    } else { setInvalidLots(p => !p.includes(index) ? [...p, index] : p); setValue(`stones.${index}.stoneName`, "") }
  }

  const handleWeightStringChange = (index: number, value: string) => {
    let c = value.replace(/[^0-9.]/g, ''), parts = c.split('.')
    if (parts.length > 2) c = parts[0] + '.' + parts.slice(1).join('')
    parts = c.split('.')
    c = parts.length > 1 ? parts[0].slice(0, 2) + '.' + parts[1].slice(0, 2) : parts[0].slice(0, 2)
    setWeightStrings(prev => ({ ...prev, [index]: c }))
  }
  const handleWeightStringBlur = (index: number) => {
    const num = parseFloat(weightStrings[index] ?? ""), v = (!isNaN(num) && num > 0) ? num : 0
    const pm = watch(`stones.${index}.pricingMode`), ppc = watch(`stones.${index}.pricePerCt`) || 0
    if (pm !== "PZ") setValue(`stones.${index}.stoneSubtotal`, v * ppc)
    setValue(`stones.${index}.weightCt`, v)
  }
  const handleQtyStringChange = (index: number, value: string) => {
    const c = value.replace(/[^0-9]/g, ''); setQuantityStrings(prev => ({ ...prev, [index]: c }))
    const num = parseInt(c)
    if (!isNaN(num) && num > 0) { const pm = watch(`stones.${index}.pricingMode`), ppc = watch(`stones.${index}.pricePerCt`) || 0, wct = watch(`stones.${index}.weightCt`) || 0; setValue(`stones.${index}.quantity`, num); setValue(`stones.${index}.stoneSubtotal`, pm === "PZ" ? ppc * num : wct * ppc) }
  }
  const handleQtyStringBlur = (index: number) => { const num = parseInt(quantityStrings[index] ?? ""), v = (!isNaN(num) && num > 0) ? num : 1; setQuantityStrings(prev => ({ ...prev, [index]: String(v) })); setValue(`stones.${index}.quantity`, v) }

  const buildPayload = (data: any, asDraft: boolean) => ({
    ...data,
    modelName: selectedModel?.name || initialData.modelName || "",
    modelBasePrice,
    totalStonesPrice,
    subtotalBeforeAdjustments,
    msInternalAdjustment,
    marginProtectionAmount,
    discountPercent: effectiveDiscountPercent,
    finalClientPrice,
    asDraft,
  })

  const onSubmit = async (data: any, asDraft = false) => {
    if (!isManual && (data.stones.some((s: any) => !s.stoneName) || invalidLots.length > 0)) { setError("Corrige los lotes inválidos antes de guardar."); return }
    setIsSaving(true); setError(null)
    try {
      if (isManual) await updateManualQuotation(quotationId, buildPayload(data, asDraft))
      else await updateQuotation(quotationId, buildPayload(data, asDraft))
    } catch (e: any) { setError(e.message || "Error al guardar."); setIsSaving(false) }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/cotizaciones/${quotationId}`} className="text-[#8E8D8A] hover:text-[#333333] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-2xl font-serif text-[#333333]">
          Editar Cotización
          {initialData.status === 'Borrador' && (
            <span className="ml-3 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200 font-sans uppercase tracking-wider align-middle">Borrador</span>
          )}
        </h2>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="space-y-8">

        {/* Datos Generales */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Datos Generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-[#333333] mb-1">Cliente / Usuario</label>
              <input {...register("clientNameOrUsername")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" /></div>
            <div><label className="block text-sm text-[#333333] mb-1">Teléfono</label>
              <input {...register("phoneNumber")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-[#333333] mb-1">Canal de Venta</label>
              <select {...register("salesChannel")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                <option value="Store">Tienda</option><option value="WhatsApp">WhatsApp</option><option value="Instagram">Instagram</option><option value="Facebook">Facebook</option><option value="TikTok">TikTok</option><option value="Form">Formulario</option>
              </select></div>
            <div><label className="block text-sm text-[#333333] mb-1">Asesora</label>
              <input disabled value={initialData.salesAssociate?.name || ""} className="w-full border border-transparent bg-[#F5F2EE] text-[#8E8D8A] rounded p-2 text-sm cursor-not-allowed" /></div>
          </div>
        </section>

        {isManual ? (
          /* Manual fields */
          <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Pieza</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-[#333333] mb-1">Tipo de Pieza</label>
                <select {...register("pieceType")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                  {catalogs.pieceTypes?.map((pt: any) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}</select></div>
              <div><label className="block text-sm text-[#333333] mb-1">Producción</label>
                <select {...register("productionTiming")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                  <option value="Regular">Regular (20 días)</option><option value="Express">Express (5 días)</option><option value="Special">Especial (+50 días)</option>
                </select></div>
            </div>
            <div><label className="block text-sm text-[#333333] mb-1">Descripción</label>
              <textarea {...register("manualPieceDescription")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} /></div>
            <div><label className="block text-sm text-[#333333] mb-1">Notas</label>
              <textarea {...register("notes")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} /></div>
            <div className="w-1/2"><label className="block text-sm text-[#333333] mb-1">Precio Final ($)</label>
              <input type="number" step="0.01" {...register("finalClientPrice", { valueAsNumber: true })} className="w-full border border-[#D8D3CC] rounded p-2 text-lg text-[#C5B358] font-bold focus:outline-none focus:border-[#C5B358]" /></div>
          </section>
        ) : (
          <>
            {/* Pieza estándar */}
            <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Pieza</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-[#333333] mb-1">Tipo de Pieza</label>
                  <select {...register("pieceType")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                    {catalogs.pieceTypes?.map((pt: any) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}</select></div>
                <div><label className="block text-sm text-[#333333] mb-1">Modelo</label>
                  <select {...register("modelId")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                    <option value="">Selecciona modelo</option>
                    {filteredModels.map((m: any) => <option key={m.id} value={m.id}>{m.name} — ${m.basePrice.toLocaleString('es-MX')}</option>)}
                  </select></div>
              </div>
              {activeUser.role === 'manager' && (
                <div className="w-1/2"><label className="block text-sm text-[#333333] mb-1">Precio Base (Manager)</label>
                  <input type="number" step="0.01" {...register("modelBasePrice", { valueAsNumber: true })} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" /></div>
              )}
              <div><label className="block text-sm text-[#333333] mb-1">Notas del diseño</label>
                <textarea {...register("notes")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} /></div>
            </section>

            {/* Piedras */}
            <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#F5F2EE] pb-2">
                <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold">Piedras</h3>
                <button type="button" onClick={() => append({ lotCode: "", stoneName: "", quantity: 1, weightCt: 0, pricePerCt: 0, pricingMode: "CT", stoneSubtotal: 0 })} className="text-xs text-[#C5B358] hover:text-[#333333] flex items-center gap-1 font-medium">
                  <Plus size={14} /> Agregar Piedra
                </button>
              </div>
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const isPZ = watch(`stones.${index}.pricingMode`) === "PZ"
                  const qtyDisplay = quantityStrings[index] !== undefined ? quantityStrings[index] : String(watch(`stones.${index}.quantity`) || 1)
                  const weightDisplay = weightStrings[index] !== undefined ? weightStrings[index] : String(watch(`stones.${index}.weightCt`) || "")
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-[#F5F2EE]/30 p-3 rounded-md border border-[#F5F2EE]">
                      <div className="col-span-2"><label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Lote</label>
                        <input {...register(`stones.${index}.lotCode`)} onBlur={(e) => handleLotCodeChange(index, e.target.value)} className="w-full border border-[#D8D3CC] rounded p-2 text-sm bg-white uppercase" /></div>
                      <div className="col-span-3"><label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Nombre</label>
                        <input disabled {...register(`stones.${index}.stoneName`)} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#8E8D8A]" /></div>
                      <div className="col-span-1"><label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Cant.</label>
                        <input type="text" inputMode="numeric" disabled={!isPZ} value={qtyDisplay} onChange={(e) => handleQtyStringChange(index, e.target.value)} onBlur={() => handleQtyStringBlur(index)} className={`w-full border ${!isPZ ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A]' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-center`} /></div>
                      <div className="col-span-2"><label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">{isPZ ? 'Peso (ref)' : 'Peso CT'}</label>
                        <input type="text" inputMode="decimal" disabled={isPZ} value={weightDisplay} onChange={(e) => handleWeightStringChange(index, e.target.value)} onBlur={() => handleWeightStringBlur(index)} className={`w-full border ${isPZ ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A]' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-right`} placeholder="0.00" /></div>
                      <div className="col-span-2"><label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Precio/CT</label>
                        <input disabled {...register(`stones.${index}.pricePerCt`, { valueAsNumber: true })} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#8E8D8A] text-right" /></div>
                      <div className="col-span-2"><label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Subtotal</label>
                        <input disabled {...register(`stones.${index}.stoneSubtotal`, { valueAsNumber: true })} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#C5B358] font-semibold text-right" /></div>
                      <div className="col-span-12 flex justify-between items-center mt-1">
                        {invalidLots.includes(index) && <span className="text-xs text-red-500">Lote no encontrado</span>}
                        <div className="ml-auto"><button type="button" onClick={() => { remove(index); setInvalidLots(p => p.filter(i => i !== index)) }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Quitar</button></div>
                      </div>
                    </div>
                  )
                })}
                {fields.length === 0 && <p className="text-xs text-[#8E8D8A] italic">Sin piedras.</p>}
              </div>
            </section>

            {/* Precio */}
            <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Precio Final</h3>
              <div className="flex justify-between text-sm text-[#333333]"><span>Subtotal:</span><span>${subtotalBeforeAdjustments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              {msInternalAdjustment > 0 && <div className="flex justify-between text-sm text-[#8E8D8A]"><span>Ajuste MS:</span><span>+${msInternalAdjustment.toLocaleString()}</span></div>}
              <div className="flex justify-between text-sm items-center">
                <label className="flex items-center gap-2 text-sm text-[#333333] cursor-pointer">
                  <input type="checkbox" {...register("marginProtectionEnabled")} className="rounded text-[#C5B358] focus:ring-[#C5B358] bg-white border-[#D8D3CC]" />
                  Ajuste interno
                </label>
                {marginProtectionEnabled && <span className="text-[#C5B358] font-medium">${marginProtectionAmount.toLocaleString()}</span>}
              </div>
              <div className="pt-3 border-t border-[#F5F2EE]">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#333333]">Descuento</span>
                    <div className="flex rounded border border-[#D8D3CC] overflow-hidden text-xs">
                      <button type="button" onClick={() => handleDiscountModeToggle('percent')} className={`px-2 py-1 transition-colors ${discountMode === 'percent' ? 'bg-[#333333] text-white' : 'bg-white text-[#8E8D8A] hover:bg-[#F5F2EE]'}`}>%</button>
                      <button type="button" onClick={() => handleDiscountModeToggle('amount')} className={`px-2 py-1 transition-colors ${discountMode === 'amount' ? 'bg-[#333333] text-white' : 'bg-white text-[#8E8D8A] hover:bg-[#F5F2EE]'}`}>$</button>
                    </div>
                  </div>
                  {discountMode === 'percent'
                    ? <input type="number" step="0.1" min="0" max="100" {...register("discountPercent", { valueAsNumber: true })} className="w-24 border border-[#D8D3CC] bg-white rounded p-2 text-sm text-right focus:outline-none focus:border-[#C5B358]" placeholder="0" />
                    : <input type="number" step="1" min="0" value={discountAmountInput} onChange={(e) => setDiscountAmountInput(Number(e.target.value))} className="w-28 border border-[#D8D3CC] bg-white rounded p-2 text-sm text-right focus:outline-none focus:border-[#C5B358]" placeholder="0" />}
                </div>
                {effectiveDiscountAmount > 0 && <div className="flex justify-between text-sm text-red-500 font-medium mt-2"><span>Descuento ({effectiveDiscountPercent.toFixed(1)}%):</span><span>-${effectiveDiscountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>}
              </div>
              <div className="flex justify-between text-lg font-serif pt-4 mt-2 border-t border-[#D8D3CC]">
                <span>Precio Final Cliente:</span>
                <div className="flex flex-col items-end">
                  {effectiveDiscountAmount > 0 && <span className="text-sm line-through text-[#8E8D8A] mb-1">${roundedPriceBeforeDiscount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>}
                  <span className="text-[#C5B358] font-semibold">${finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Botones */}
        <div className="flex justify-between items-center pt-4">
          <Link href={`/cotizaciones/${quotationId}`} className="text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors">
            Cancelar
          </Link>
          <div className="flex gap-3">
            <button type="button" disabled={isSaving} onClick={handleSubmit((d) => onSubmit(d, true))} className="bg-white border border-[#D8D3CC] text-[#8E8D8A] hover:bg-[#F5F2EE] hover:text-[#333333] px-6 py-3 rounded-md text-sm font-semibold transition-colors disabled:opacity-50">
              Guardar borrador
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#333333] hover:bg-black text-white px-8 py-3 rounded-md text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50">
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
