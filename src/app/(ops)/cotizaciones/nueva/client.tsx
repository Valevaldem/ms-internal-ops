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
  modelBasePrice: z.number().min(0).optional(),
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
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent')
  const [discountAmountInput, setDiscountAmountInput] = useState<number>(0)
  const [quantityStrings, setQuantityStrings] = useState<Record<number, string>>({})
  const [weightStrings, setWeightStrings] = useState<Record<number, string>>({})

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clientNameOrUsername: initialData?.clientNameOrUsername || "",
      phoneNumber: initialData?.phoneNumber || "",
      salesChannel: initialData?.salesChannel || "Store",
      salesAssociateId: isAdvisor ? activeUser.salesAssociateId : (initialData?.salesAssociateId || ""),
      pieceType: initialData?.pieceType || (catalogs.pieceTypes && catalogs.pieceTypes[0]?.name) || "Ring",
      modelId: initialData?.modelId || "",
      modelBasePrice: initialData?.modelBasePrice || 0,
      notes: initialData?.notes || "",
      marginProtectionEnabled: initialData?.marginProtectionEnabled || false,
      discountPercent: initialData?.discountPercent || 0,
      stones: initialData?.stones?.map((s: any) => ({
        lotCode: s.lotCode, stoneName: s.stoneName, quantity: s.quantity || 1,
        weightCt: s.weightCt, pricePerCt: s.pricePerCt,
        pricingMode: s.pricingMode || "CT", stoneSubtotal: s.stoneSubtotal
      })) || []
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "stones" })
  const modelId = watch("modelId")
  const associateId = watch("salesAssociateId")
  const marginProtectionEnabled = watch("marginProtectionEnabled")
  const discountPercent = watch("discountPercent")
  const stones = watch("stones")
  const pieceType = watch("pieceType")
  const manualBasePrice = watch("modelBasePrice")

  const selectedModel = catalogs.models.find((m: any) => m.id === modelId)
  const selectedAssociate = catalogs.associates.find((a: any) => a.id === associateId)
  const selectedPieceTypeObj = catalogs.pieceTypes?.find((pt: any) => pt.name === pieceType)
  const filteredModels = catalogs.models.filter((m: any) => m.pieceTypeId === selectedPieceTypeObj?.id)

  const modelBasePrice = activeUser.role === 'manager' && manualBasePrice !== undefined ? manualBasePrice : (selectedModel?.basePrice || 0)
  const totalStonesPrice = stones.reduce((sum, s) => sum + (s.stoneSubtotal || 0), 0)
  const subtotalBeforeAdjustments = totalStonesPrice + modelBasePrice
  const msInternalAdjustment = selectedAssociate?.appliesMsAdjustment ? 5000 : 0
  const baseForMargin = subtotalBeforeAdjustments + msInternalAdjustment
  const marginProtectionAmount = marginProtectionEnabled ? baseForMargin * 0.15 : 0
  const rawClientPrice = baseForMargin + marginProtectionAmount

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

  let effectiveDiscountPercent = 0, effectiveDiscountAmount = 0;
  if (discountMode === 'percent') {
    effectiveDiscountPercent = discountPercent || 0;
    effectiveDiscountAmount = (roundedPriceBeforeDiscount * effectiveDiscountPercent) / 100;
  } else {
    effectiveDiscountAmount = discountAmountInput || 0;
    effectiveDiscountPercent = roundedPriceBeforeDiscount > 0 ? (effectiveDiscountAmount / roundedPriceBeforeDiscount) * 100 : 0;
  }
  const finalClientPrice = roundedPriceBeforeDiscount - effectiveDiscountAmount;

  const handleDiscountModeToggle = (mode: 'percent' | 'amount') => {
    setDiscountMode(mode);
    if (mode === 'percent') {
      const pct = roundedPriceBeforeDiscount > 0 ? (discountAmountInput / roundedPriceBeforeDiscount) * 100 : 0;
      setValue('discountPercent', Math.round(pct * 10) / 10);
    } else {
      setDiscountAmountInput(Math.round((roundedPriceBeforeDiscount * (discountPercent || 0)) / 100));
    }
  };

  const handleQuantityStringChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    setQuantityStrings(prev => ({ ...prev, [index]: cleaned }))
    const num = parseInt(cleaned)
    if (!isNaN(num) && num > 0) {
      const pricingMode = watch(`stones.${index}.pricingMode`)
      const pricePerCt = watch(`stones.${index}.pricePerCt`) || 0
      const weightCt = watch(`stones.${index}.weightCt`) || 0
      setValue(`stones.${index}.quantity`, num)
      setValue(`stones.${index}.stoneSubtotal`, pricingMode === "PZ" ? pricePerCt * num : weightCt * pricePerCt)
    }
  }

  const handleQuantityStringBlur = (index: number) => {
    const num = parseInt(quantityStrings[index] ?? "")
    const validNum = (!isNaN(num) && num > 0) ? num : 1
    setQuantityStrings(prev => ({ ...prev, [index]: String(validNum) }))
    setValue(`stones.${index}.quantity`, validNum)
  }

  const handleWeightChange = (index: number, weight: number) => {
    const pricingMode = watch(`stones.${index}.pricingMode`)
    const pricePerCt = watch(`stones.${index}.pricePerCt`) || 0
    if (pricingMode !== "PZ") setValue(`stones.${index}.stoneSubtotal`, weight * pricePerCt)
  }

  const handleWeightStringChange = (index: number, value: string) => {
    let cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('')
    const intPart = parts[0].slice(0, 2)
    cleaned = parts.length > 1 ? intPart + '.' + parts[1] : intPart
    if (parts.length > 1 && parts[1].length > 2) cleaned = parts[0].slice(0, 2) + '.' + parts[1].slice(0, 2)
    setWeightStrings(prev => ({ ...prev, [index]: cleaned }))
  }

  const handleWeightStringBlur = (index: number) => {
    const num = parseFloat(weightStrings[index] ?? "")
    const validNum = (!isNaN(num) && num > 0) ? num : 0
    handleWeightChange(index, validNum)
    setValue(`stones.${index}.weightCt`, validNum)
  }

  const handleLotCodeChange = (index: number, code: string) => {
    if (!code) {
      setInvalidLots(prev => prev.filter(i => i !== index))
      setValue(`stones.${index}.stoneName`, ""); setValue(`stones.${index}.pricePerCt`, 0); setValue(`stones.${index}.stoneSubtotal`, 0)
      return
    }
    const lot = catalogs.stones.find((s: any) => s.code.toUpperCase() === code.toUpperCase())
    if (lot) {
      setInvalidLots(prev => prev.filter(i => i !== index))
      setValue(`stones.${index}.lotCode`, lot.code); setValue(`stones.${index}.stoneName`, lot.stoneName)
      setValue(`stones.${index}.pricePerCt`, lot.pricePerCt); setValue(`stones.${index}.pricingMode`, lot.pricingMode || "CT")
      const weight = watch(`stones.${index}.weightCt`) || 0, qty = watch(`stones.${index}.quantity`) || 1
      setValue(`stones.${index}.stoneSubtotal`, lot.pricingMode === "PZ" ? lot.pricePerCt * qty : weight * lot.pricePerCt)
    } else {
      setInvalidLots(prev => !prev.includes(index) ? [...prev, index] : prev)
      setValue(`stones.${index}.stoneName`, "")
    }
  }

  const buildPayload = (data: any, asDraft = false) => {
    if (initialData?.id) data.versionFromId = initialData.id;
    return { ...data, associateId: data.salesAssociateId, modelName: selectedModel?.name || "Desconocido", modelBasePrice, totalStonesPrice, subtotalBeforeAdjustments, msInternalAdjustment, marginProtectionAmount, discountPercent: effectiveDiscountPercent, finalClientPrice, validUntilDate: new Date(Date.now() + 15 * 86400000), asDraft }
  }

  const onSubmit = async (data: any) => {
    if (data.stones.some((s: any) => !s.stoneName) || invalidLots.length > 0) { alert("Por favor corrige los lotes inválidos."); return }
    try { await createQuotation(buildPayload(data, false)); router.push("/cotizaciones/historial") } catch (e) { console.error(e); alert("Error al guardar.") }
  }

  const onSaveDraft = async (data: any) => {
    try { const result = await createQuotation(buildPayload(data, true)); router.push(`/cotizaciones/${result?.id}`) } catch (e) { console.error(e); alert("Error al guardar borrador.") }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h2 className="text-2xl font-serif text-[#333333] mb-6">Nueva Cotización</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Datos Generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Cliente / Usuario</label>
              <input readOnly={!!initialData} {...register("clientNameOrUsername")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} placeholder="Ej. Maria Lopez" />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Teléfono</label>
              <input readOnly={!!initialData} {...register("phoneNumber")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} placeholder="Opcional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Canal de Venta</label>
              <select disabled={!!initialData} {...register("salesChannel")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}>
                <option value="Store">Tienda</option><option value="WhatsApp">WhatsApp</option><option value="Instagram">Instagram</option><option value="Facebook">Facebook</option><option value="TikTok">TikTok</option><option value="Form">Formulario</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Asesora</label>
              {isAdvisor ? (
                <input disabled value={activeUser.name || ''} className="w-full border border-transparent bg-[#F5F2EE] text-[#8E8D8A] rounded p-2 text-sm cursor-not-allowed" />
              ) : (
                <select disabled={!!initialData} {...register("salesAssociateId")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}>
                  <option value="">Selecciona asesora</option>
                  {catalogs.associates.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Pieza</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Tipo de Pieza</label>
              <select disabled={!!initialData} {...register("pieceType")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}>
                {catalogs.pieceTypes?.map((pt: any) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Modelo</label>
              <select disabled={!!initialData} {...register("modelId")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}>
                <option value="">Selecciona modelo</option>
                {filteredModels.map((m: any) => <option key={m.id} value={m.id}>{m.name} — ${m.basePrice.toLocaleString('es-MX')}</option>)}
              </select>
              {errors.modelId && <span className="text-xs text-red-500">{errors.modelId.message as string}</span>}
            </div>
          </div>
          {activeUser.role === 'manager' && (
            <div className="w-1/2">
              <label className="block text-sm text-[#333333] mb-1">Precio Base Manual (Manager)</label>
              <input type="number" step="0.01" {...register("modelBasePrice", { valueAsNumber: true })} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
            </div>
          )}
          <div>
            <label className="block text-sm text-[#333333] mb-1">Notas del diseño</label>
            <textarea readOnly={!!initialData} {...register("notes")} className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`} rows={2}></textarea>
          </div>
        </section>

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#F5F2EE] pb-2">
            <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold">Piedras</h3>
            <button type="button" onClick={() => append({ lotCode: "", stoneName: "", quantity: 1, weightCt: 0, pricePerCt: 0, pricingMode: "CT", stoneSubtotal: 0 })} className="text-xs text-[#C5B358] hover:text-[#333333] flex items-center gap-1 transition-colors font-medium">
              <Plus size={14} /> Agregar Piedra
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => {
              const pricingMode = watch(`stones.${index}.pricingMode`)
              const isPZ = pricingMode === "PZ"
              const qtyDisplay = quantityStrings[index] !== undefined ? quantityStrings[index] : String(watch(`stones.${index}.quantity`) || 1)
              const weightDisplay = weightStrings[index] !== undefined ? weightStrings[index] : String(watch(`stones.${index}.weightCt`) || "")
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-[#F5F2EE]/30 p-3 rounded-md border border-[#F5F2EE]">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Lote</label>
                    <input {...register(`stones.${index}.lotCode`)} onBlur={(e) => handleLotCodeChange(index, e.target.value)} className="w-full border border-[#D8D3CC] rounded p-2 text-sm bg-white uppercase" placeholder="Ej: D-001" />
                  </div>
                  <div className="col-span-3 relative">
                    <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Nombre</label>
                    <input disabled {...register(`stones.${index}.stoneName`)} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#8E8D8A]" />
                    {isPZ && <span className="absolute top-1 right-2 text-[9px] bg-[#D8D3CC] text-[#333333] px-1 rounded">Precio por Pieza</span>}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Cant.</label>
                    <input type="text" inputMode="numeric" disabled={!isPZ} value={qtyDisplay} onChange={(e) => handleQuantityStringChange(index, e.target.value)} onBlur={() => handleQuantityStringBlur(index)} className={`w-full border ${!isPZ ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A]' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-center`} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{isPZ ? 'Peso CT (ref)' : 'Peso CT'}</label>
                    <input type="text" inputMode="decimal" disabled={isPZ} value={weightDisplay} onChange={(e) => handleWeightStringChange(index, e.target.value)} onBlur={() => handleWeightStringBlur(index)} className={`w-full border ${isPZ ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A]' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-right`} placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Precio/CT</label>
                    <input disabled {...register(`stones.${index}.pricePerCt`, { valueAsNumber: true })} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#8E8D8A] text-right" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase text-[#8E8D8A] mb-1">Subtotal</label>
                    <input disabled {...register(`stones.${index}.stoneSubtotal`, { valueAsNumber: true })} className="w-full border border-transparent rounded p-2 text-sm bg-[#F5F2EE] text-[#C5B358] font-semibold text-right" />
                  </div>
                  <div className="col-span-12 flex justify-between items-center mt-1">
                    {invalidLots.includes(index) && <span className="text-xs text-red-500">Lote no encontrado en inventario</span>}
                    <div className="ml-auto">
                      <button type="button" onClick={() => { remove(index); setInvalidLots(prev => prev.filter(i => i !== index)) }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors">
                        <Trash2 size={12} /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {fields.length === 0 && <p className="text-xs text-[#8E8D8A] italic">Sin piedras. Haz clic en "Agregar Piedra" para incluir.</p>}
          </div>
        </section>

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Precio Final</h3>
          <div className="flex justify-between text-sm text-[#333333]">
            <span>Subtotal:</span><span>${subtotalBeforeAdjustments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          {msInternalAdjustment > 0 && (
            <div className="flex justify-between text-sm text-[#8E8D8A]">
              <span>Ajuste MS:</span><span>+${msInternalAdjustment.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <label className={`flex items-center gap-2 text-sm text-[#333333] ${initialData ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              <input type="checkbox" disabled={!!initialData} {...register("marginProtectionEnabled")} className="rounded text-[#C5B358] focus:ring-[#C5B358] bg-white border-[#D8D3CC] disabled:opacity-50" />
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
              {discountMode === 'percent' ? (
                <input readOnly={!!initialData} type="number" step="0.1" min="0" max="100" {...register("discountPercent", { valueAsNumber: true })} className={`w-24 border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-right focus:outline-none focus:border-[#C5B358]`} placeholder="0" />
              ) : (
                <input type="number" step="1" min="0" value={discountAmountInput} onChange={(e) => setDiscountAmountInput(Number(e.target.value))} className="w-28 border border-[#D8D3CC] bg-white rounded p-2 text-sm text-right focus:outline-none focus:border-[#C5B358]" placeholder="0" />
              )}
            </div>
            {effectiveDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-500 font-medium mt-2">
                <span>Descuento ({effectiveDiscountPercent.toFixed(1)}%):</span>
                <span>-${effectiveDiscountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-lg font-serif pt-4 mt-2 border-t border-[#D8D3CC]">
            <span>Precio Final Cliente:</span>
            <div className="flex flex-col items-end">
              {effectiveDiscountAmount > 0 && <span className="text-sm line-through text-[#8E8D8A] mb-1">${roundedPriceBeforeDiscount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>}
              <span className="text-[#C5B358] font-semibold">${finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" disabled={isSubmitting} onClick={handleSubmit(onSaveDraft)} className="bg-white border border-[#D8D3CC] text-[#8E8D8A] hover:bg-[#F5F2EE] hover:text-[#333333] px-6 py-3 rounded-md text-sm font-semibold transition-colors disabled:opacity-50">
            Guardar borrador
          </button>
          <button type="submit" disabled={isSubmitting} className="bg-[#333333] hover:bg-black text-white px-8 py-3 rounded-md text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50">
            {isSubmitting ? "Guardando..." : "Crear Cotización"}
          </button>
        </div>
      </form>
    </div>
  )
}
