"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { createQuotation } from "./actions"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Info } from "lucide-react"
import type { ActiveUser } from "@/lib/auth"

const CUSTOM_MODEL_ID = "__personalizado__"

const schema = z.object({
  clientNameOrUsername: z.string().min(1, "Requerido"),
  phoneNumber: z.string().optional(),
  salesChannel: z.enum(["Store", "WhatsApp", "Instagram", "Facebook", "TikTok", "Form"]),
  salesAssociateId: z.string().min(1, "Requerido"),
  pieceType: z.string().min(1, "Requerido"),
  modelId: z.string().min(1, "Requerido"),
  modelBasePrice: z.number().min(0).optional(),
  customProductionDays: z.number().min(1).optional(),
  manualPieceDescription: z.string().optional(),
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

export default function NuevaCotizacionClient({
  catalogs,
  initialData,
  activeUser
}: {
  catalogs: any
  initialData?: any
  activeUser: ActiveUser
}) {
  const router = useRouter()
  const [invalidLots, setInvalidLots] = useState<number[]>([])
  const isAdvisor = activeUser.role === "advisor"

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
      customProductionDays: initialData?.customProductionDays || 15,
      manualPieceDescription: initialData?.manualPieceDescription || "",
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
  const pieceType = watch("pieceType")
  const manualBasePrice = watch("modelBasePrice")

  const selectedPieceTypeObj = catalogs.pieceTypes?.find((pt: any) => pt.name === pieceType)
  const filteredModels = catalogs.models.filter((m: any) => m.pieceTypeId === selectedPieceTypeObj?.id)

  const isCustomModel = modelId === CUSTOM_MODEL_ID
  const selectedModel = isCustomModel ? null : catalogs.models.find((m: any) => m.id === modelId)
  const selectedAssociate = catalogs.associates.find((a: any) => a.id === associateId)

  // Show model note when a real model is selected
  const modelNote = selectedModel?.note || null
  const modelProductionDays = selectedModel?.productionDays ?? null

  // Calculations
  const modelBasePrice = isCustomModel
    ? (manualBasePrice || 0)
    : (activeUser.role === 'manager' && manualBasePrice !== undefined ? manualBasePrice : (selectedModel?.basePrice || 0))

  const totalStonesPrice = stones.reduce((sum, s) => sum + (s.stoneSubtotal || 0), 0)
  const subtotalBeforeAdjustments = totalStonesPrice + modelBasePrice
  const msInternalAdjustment = selectedAssociate?.appliesMsAdjustment ? 5000 : 0

  let baseForMargin = subtotalBeforeAdjustments + msInternalAdjustment
  const marginProtectionAmount = marginProtectionEnabled ? baseForMargin * 0.15 : 0
  const rawClientPrice = baseForMargin + marginProtectionAmount

  const getRoundedCommercialPrice = (price: number) => {
    if (price === 0) return 0
    const baseThousand = Math.floor(price / 1000) * 1000
    const remainder = price - baseThousand
    if (remainder === 0) return baseThousand
    if (remainder <= 500) return baseThousand + 500
    if (remainder <= 850) return baseThousand + 850
    return baseThousand + 1000
  }

  const roundedPriceBeforeDiscount = getRoundedCommercialPrice(rawClientPrice)
  const calculatedDiscountAmount = (roundedPriceBeforeDiscount * (discountPercent || 0)) / 100
  const finalClientPrice = roundedPriceBeforeDiscount - calculatedDiscountAmount

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

  const handleQuantityStringChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '')
    setQuantityStrings(prev => ({ ...prev, [index]: cleaned }))
  }

  const handleQuantityStringBlur = (index: number) => {
    const raw = quantityStrings[index] ?? ""
    const num = parseInt(raw, 10)
    const validNum = (!isNaN(num) && num >= 1) ? num : 1
    setQuantityStrings(prev => ({ ...prev, [index]: String(validNum) }))
    handleQuantityChange(index, validNum)
    setValue(`stones.${index}.quantity`, validNum)
  }

  const handleWeightStringChange = (index: number, raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('')
    if (parts[0].length > 2) {
      const intPart = parts[0].slice(0, 2)
      cleaned = parts.length > 1 ? intPart + '.' + parts[1] : intPart
    }
    if (parts.length > 1 && parts[1].length > 2) {
      cleaned = parts[0].slice(0, 2) + '.' + parts[1].slice(0, 2)
    }
    setWeightStrings(prev => ({ ...prev, [index]: cleaned }))
  }

  const handleWeightStringBlur = (index: number) => {
    const raw = weightStrings[index] ?? ""
    const num = parseFloat(raw)
    const validNum = (!isNaN(num) && num > 0) ? num : 0
    handleWeightChange(index, validNum)
    setValue(`stones.${index}.weightCt`, validNum)
  }

  const onSubmit = async (data: any) => {
    if (initialData?.id) data.versionFromId = initialData.id
    if (data.stones.some((s: any) => !s.stoneName) || invalidLots.length > 0) {
      alert("Por favor corrige los lotes inválidos antes de continuar.")
      return
    }

    const isCustom = data.modelId === CUSTOM_MODEL_ID
    const modelName = isCustom ? "Personalizado" : (selectedModel?.name || "Desconocido")

    const payload = {
      ...data,
      associateId: data.salesAssociateId,
      modelName,
      modelId: isCustom ? null : data.modelId,
      isCustomModel: isCustom,
      modelBasePrice,
      customProductionDays: isCustom ? (data.customProductionDays || 15) : null,
      manualPieceDescription: isCustom ? (data.manualPieceDescription || "") : null,
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

        {/* Datos Generales */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Datos Generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Cliente / Usuario <span className="text-red-500">*</span></label>
              <input
                readOnly={!!initialData}
                {...register("clientNameOrUsername")}
                className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
                placeholder="Ej. Maria Lopez / @marialopez"
              />
              {errors.clientNameOrUsername && <span className="text-xs text-red-500">{errors.clientNameOrUsername.message as string}</span>}
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Teléfono</label>
              <input
                readOnly={!!initialData}
                {...register("phoneNumber")}
                className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
                placeholder="10 dígitos"
              />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Canal de Venta</label>
              <select
                disabled={!!initialData}
                {...register("salesChannel")}
                className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
              >
                <option value="Store">Tienda Física</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="Form">Formulario Web</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Asesora <span className="text-red-500">*</span></label>
              <select
                disabled={isAdvisor || !!initialData}
                {...register("salesAssociateId")}
                className={`w-full border ${isAdvisor || initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
              >
                <option value="">Selecciona asesora...</option>
                {catalogs.associates?.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {errors.salesAssociateId && <span className="text-xs text-red-500">{errors.salesAssociateId.message as string}</span>}
            </div>
          </div>
        </section>

        {/* Pieza */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Pieza</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Tipo de Pieza <span className="text-red-500">*</span></label>
              <select
                {...register("pieceType", {
                  onChange: () => {
                    setValue("modelId", "")
                    setValue("modelBasePrice", 0)
                  }
                })}
                disabled={!!initialData}
                className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] pointer-events-none appearance-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
                tabIndex={initialData ? -1 : 0}
              >
                {catalogs.pieceTypes?.map((pt: any) => (
                  <option key={pt.id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Modelo Base <span className="text-red-500">*</span></label>
              <select
                {...register("modelId", {
                  onChange: (e) => {
                    const newModelId = e.target.value
                    if (newModelId === CUSTOM_MODEL_ID) {
                      setValue("modelBasePrice", 0)
                    } else {
                      const newModel = catalogs.models.find((m: any) => m.id === newModelId)
                      if (newModel) setValue("modelBasePrice", newModel.basePrice)
                    }
                  }
                })}
                disabled={!!initialData}
                className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] pointer-events-none appearance-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
                tabIndex={initialData ? -1 : 0}
              >
                <option value="">Selecciona modelo...</option>
                {filteredModels.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                <option value={CUSTOM_MODEL_ID}>— Personalizado —</option>
              </select>
              {errors.modelId && <span className="text-xs text-red-500">{errors.modelId.message as string}</span>}
            </div>

            {/* Nota del modelo — solo cuando hay un modelo real seleccionado con nota */}
            {!isCustomModel && modelNote && (
              <div className="col-span-2">
                <div className="flex items-start gap-2 bg-[#FFF9EC] border border-[#C5B358]/40 rounded-lg px-4 py-3">
                  <Info size={15} className="text-[#C5B358] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#C5B358] mb-0.5 uppercase tracking-wide">Nota del modelo</p>
                    <p className="text-sm text-[#333333]">{modelNote}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Días de producción del modelo */}
            {!isCustomModel && modelProductionDays && (
              <div className="col-span-2">
                <p className="text-xs text-[#8E8D8A]">
                  ⏱ Tiempo estimado de producción para este modelo: <span className="font-semibold text-[#333333]">{modelProductionDays} días hábiles</span>
                </p>
              </div>
            )}

            {/* Precio Base */}
            <div className={`${isCustomModel ? '' : 'col-span-2 sm:col-span-1'}`}>
              <label className="block text-sm text-[#333333] mb-1">Precio Base</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8D8A]">$</span>
                <input
                  type="number"
                  step="0.01"
                  readOnly={!isCustomModel && (activeUser.role !== 'manager' || !!initialData)}
                  {...register("modelBasePrice", { valueAsNumber: true })}
                  className={`w-full pl-8 pr-3 border ${(!isCustomModel && (activeUser.role !== 'manager' || initialData)) ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
                />
              </div>
            </div>

            {/* PERSONALIZADO: Descripción y días de producción custom */}
            {isCustomModel && (
              <>
                <div>
                  <label className="block text-sm text-[#333333] mb-1">Días hábiles de producción <span className="text-red-500">*</span></label>
                  <select
                    {...register("customProductionDays", { valueAsNumber: true })}
                    className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
                  >
                    <option value={5}>5 días hábiles (Express)</option>
                    <option value={20}>20 días hábiles (Regular)</option>
                    <option value={50}>50 días hábiles (Especial)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-[#333333] mb-1">Descripción de la pieza personalizada <span className="text-red-500">*</span></label>
                  <textarea
                    {...register("manualPieceDescription")}
                    rows={2}
                    className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
                    placeholder="Ej. Anillo solitario con engaste en prongas, sin piedra incluida."
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm text-[#333333] mb-1">Notas del diseño</label>
            <textarea
              readOnly={!!initialData}
              {...register("notes")}
              className={`w-full border ${initialData ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed outline-none focus:outline-none' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]`}
              rows={2}
            />
          </div>
        </section>

        {/* Piedras */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#F5F2EE] pb-2">
            <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold">Piedras</h3>
            {!initialData && (
              <button
                type="button"
                onClick={() => append({ lotCode: "", stoneName: "", quantity: 1, weightCt: 0, pricePerCt: 0, pricingMode: "CT", stoneSubtotal: 0 })}
                className="text-xs text-[#C5B358] hover:text-[#333333] flex items-center gap-1 transition-colors font-medium"
              >
                <Plus size={14} /> Agregar Piedra
              </button>
            )}
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const pricingMode = watch(`stones.${index}.pricingMode`)
              const isPZ = pricingMode === "PZ"
              const qtyDisplay = quantityStrings[index] !== undefined
                ? quantityStrings[index]
                : String(watch(`stones.${index}.quantity`) || 1)
              const weightDisplay = weightStrings[index] !== undefined
                ? weightStrings[index]
                : String(watch(`stones.${index}.weightCt`) || "")
              const stoneSubtotal = watch(`stones.${index}.stoneSubtotal`) || 0
              const stoneName = watch(`stones.${index}.stoneName`) || ""
              const isInvalid = invalidLots.includes(index)

              return (
                <div key={field.id} className={`grid grid-cols-12 gap-2 items-start p-3 rounded-lg border ${isInvalid ? 'border-red-300 bg-red-50' : 'border-[#F5F2EE] bg-[#FAFAFA]'}`}>
                  <div className="col-span-3">
                    <label className="block text-xs text-[#8E8D8A] mb-1">Lote</label>
                    <input
                      readOnly={!!initialData}
                      placeholder="Código"
                      defaultValue={field.lotCode}
                      onBlur={(e) => handleLotCodeChange(index, e.target.value)}
                      onChange={(e) => {
                        setValue(`stones.${index}.lotCode`, e.target.value.toUpperCase())
                      }}
                      className={`w-full border ${isInvalid ? 'border-red-400' : 'border-[#D8D3CC]'} ${initialData ? 'bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'bg-white'} rounded p-1.5 text-xs focus:outline-none focus:border-[#C5B358]`}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-[#8E8D8A] mb-1">Piedra</label>
                    <input
                      readOnly
                      value={stoneName
                        ? `${stoneName}${catalogs.stones?.find((s: any) => s.code === watch(`stones.${index}.lotCode`))?.stoneName
                          ? ` — Lote: ${watch(`stones.${index}.lotCode`)}`
                          : ''}`
                        : (isInvalid ? "Lote no encontrado" : "")}
                      className={`w-full border border-transparent ${isInvalid ? 'text-red-500' : 'text-[#8E8D8A]'} bg-[#F5F2EE] rounded p-1.5 text-xs cursor-not-allowed`}
                      placeholder="Auto"
                    />
                  </div>
                  {!isPZ && (
                    <div className="col-span-2">
                      <label className="block text-xs text-[#8E8D8A] mb-1">Peso CT</label>
                      <input
                        readOnly={!!initialData}
                        type="text"
                        inputMode="decimal"
                        value={weightDisplay}
                        onChange={(e) => handleWeightStringChange(index, e.target.value)}
                        onBlur={() => handleWeightStringBlur(index)}
                        className={`w-full border border-[#D8D3CC] ${initialData ? 'bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'bg-white'} rounded p-1.5 text-xs focus:outline-none focus:border-[#C5B358]`}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                  <div className={`${isPZ ? 'col-span-2' : 'col-span-2'}`}>
                    <label className="block text-xs text-[#8E8D8A] mb-1">PZ</label>
                    <input
                      readOnly={!!initialData}
                      type="text"
                      inputMode="numeric"
                      value={qtyDisplay}
                      onChange={(e) => handleQuantityStringChange(index, e.target.value)}
                      onBlur={() => handleQuantityStringBlur(index)}
                      className={`w-full border border-[#D8D3CC] ${initialData ? 'bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed' : 'bg-white'} rounded p-1.5 text-xs focus:outline-none focus:border-[#C5B358]`}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col justify-end">
                    <label className="block text-xs text-[#8E8D8A] mb-1">Subtotal</label>
                    <span className="text-xs font-semibold text-[#C5B358] pt-1.5">
                      ${stoneSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {!initialData && (
                    <div className="col-span-1 flex items-end justify-center pb-0.5">
                      <button type="button" onClick={() => remove(index)} className="text-[#D8D3CC] hover:text-red-400 transition-colors mt-5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {fields.length === 0 && (
              <p className="text-xs text-[#8E8D8A] text-center py-3">
                {initialData ? "Sin piedras en esta cotización." : "Agrega piedras del inventario para incluirlas en el precio."}
              </p>
            )}
          </div>
        </section>

        {/* Precios */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Resumen de Precios</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#555555]">
              <span>Base modelo</span>
              <span>${modelBasePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[#555555]">
              <span>Subtotal piedras</span>
              <span>${totalStonesPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            {msInternalAdjustment > 0 && (
              <div className="flex justify-between text-[#555555]">
                <span>Ajuste MS</span>
                <span>+${msInternalAdjustment.toLocaleString('es-MX')}</span>
              </div>
            )}
            {!initialData && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#F5F2EE]">
                <input
                  type="checkbox"
                  id="marginProtectionEnabled"
                  {...register("marginProtectionEnabled")}
                  className="accent-[#C5B358]"
                />
                <label htmlFor="marginProtectionEnabled" className="text-[#555555] text-sm cursor-pointer">
                  Protección de margen (15%)
                </label>
                {marginProtectionEnabled && (
                  <span className="text-[#C5B358] text-sm ml-auto">
                    +${marginProtectionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}
            {!initialData && (
              <div className="flex items-center gap-4 pt-2">
                <label className="text-[#555555] text-sm whitespace-nowrap">Descuento %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  {...register("discountPercent", { valueAsNumber: true })}
                  className="w-24 border border-[#D8D3CC] rounded p-1.5 text-sm focus:outline-none focus:border-[#C5B358]"
                />
                {(discountPercent || 0) > 0 && (
                  <span className="text-red-500 text-sm">
                    −${calculatedDiscountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#F5F2EE] rounded-lg p-4 flex justify-between items-center mt-4">
            <span className="text-sm font-medium text-[#555555]">Precio Final Cliente</span>
            <span className="text-2xl font-bold text-[#C5B358]">
              ${finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </section>

        {!initialData && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#333333] hover:bg-black text-white px-8 py-3 rounded-md text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Crear Cotización"}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
