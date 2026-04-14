"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { createStockQuotation } from "./actions"
import type { ActiveUser } from "@/lib/auth"

export default function CotizacionStockClient({
  catalogs,
  activeUser,
}: {
  catalogs: any
  activeUser: ActiveUser
}) {
  const router = useRouter()
  const [invalidLots, setInvalidLots] = useState<number[]>([])
  const [quantityStrings, setQuantityStrings] = useState<Record<number, string>>({})
  const [weightStrings, setWeightStrings] = useState<Record<number, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      referenceCode: "",
      pieceType: (catalogs.pieceTypes && catalogs.pieceTypes[0]?.name) || "Ring",
      modelId: "",
      modelBasePrice: 0,
      notes: "",
      stones: [] as any[],
      finalClientPrice: 0,
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "stones" })

  const modelId = watch("modelId")
  const stones = watch("stones")
  const pieceType = watch("pieceType")
  const modelBasePrice = watch("modelBasePrice")
  const finalClientPrice = watch("finalClientPrice")

  const selectedModel = catalogs.models.find((m: any) => m.id === modelId)
  const selectedPieceTypeObj = catalogs.pieceTypes?.find((pt: any) => pt.name === pieceType)
  const filteredModels = catalogs.models.filter((m: any) => m.pieceTypeId === selectedPieceTypeObj?.id)

  // Al seleccionar modelo, pre-llenar precio base (editable para stock_operator)
  const handleModelChange = (id: string) => {
    setValue("modelId", id)
    const model = catalogs.models.find((m: any) => m.id === id)
    if (model) setValue("modelBasePrice", model.basePrice)
  }

  // Cálculos — subtotal de piedras sin redondear
  const totalStonesPrice = stones.reduce((sum: number, s: any) => sum + (s.stoneSubtotal || 0), 0)
  const subtotal = (Number(modelBasePrice) || selectedModel?.basePrice || 0) + totalStonesPrice

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
  const handleQtyChange = (index: number, value: string) => {
    const c = value.replace(/[^0-9]/g, ''); setQuantityStrings(prev => ({ ...prev, [index]: c }))
    const num = parseInt(c)
    if (!isNaN(num) && num > 0) {
      const pm = watch(`stones.${index}.pricingMode`), ppc = watch(`stones.${index}.pricePerCt`) || 0, wct = watch(`stones.${index}.weightCt`) || 0
      setValue(`stones.${index}.quantity`, num)
      setValue(`stones.${index}.stoneSubtotal`, pm === "PZ" ? ppc * num : wct * ppc)
    }
  }
  const handleQtyBlur = (index: number) => { const num = parseInt(quantityStrings[index] ?? ""), v = (!isNaN(num) && num > 0) ? num : 1; setQuantityStrings(prev => ({ ...prev, [index]: String(v) })); setValue(`stones.${index}.quantity`, v) }

  const onSubmit = async (data: any) => {
    if (invalidLots.length > 0) { setError("Corrige los lotes inválidos antes de guardar."); return }
    setIsSaving(true); setError(null)
    try {
      const result = await createStockQuotation({
        ...data,
        operatorId: activeUser.id,
        operatorName: activeUser.name,
        totalStonesPrice,
        subtotal,
        modelName: selectedModel?.name || "",
      })
      router.push(`/cotizaciones/${result.id}`)
    } catch (e: any) { setError(e.message || "Error al guardar."); setIsSaving(false) }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-[#333333]">Cotización de Stock</h2>
        <p className="text-sm text-[#8E8D8A] mt-1">Cotización interna para piezas de stock — sin datos de cliente</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* Identificación */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Identificación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Código de Referencia / SKU</label>
              <input {...register("referenceCode")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Ej. STOCK-001" />
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Operador</label>
              <input disabled value={activeUser.name} className="w-full border border-transparent bg-[#F5F2EE] text-[#8E8D8A] rounded p-2 text-sm cursor-not-allowed" />
            </div>
          </div>
        </section>

        {/* Pieza */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Pieza</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#333333] mb-1">Tipo de Pieza</label>
              <select {...register("pieceType")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]">
                {catalogs.pieceTypes?.map((pt: any) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#333333] mb-1">Modelo</label>
              <select
                value={modelId}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
              >
                <option value="">Selecciona modelo</option>
                {filteredModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="w-1/2">
            <label className="block text-sm text-[#333333] mb-1">Precio Base del Modelo ($)</label>
            <input
              type="number" step="0.01"
              {...register("modelBasePrice", { valueAsNumber: true })}
              className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
            />
            <p className="text-xs text-[#8E8D8A] mt-1">Editable — para ajustar según precio real de stock</p>
          </div>
          <div>
            <label className="block text-sm text-[#333333] mb-1">Notas</label>
            <textarea {...register("notes")} className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} placeholder="Color de oro, talla, acabado..." />
          </div>
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
                    <input type="text" inputMode="numeric" disabled={!isPZ} value={qtyDisplay} onChange={(e) => handleQtyChange(index, e.target.value)} onBlur={() => handleQtyBlur(index)} className={`w-full border ${!isPZ ? 'border-transparent bg-[#F5F2EE] text-[#8E8D8A]' : 'border-[#D8D3CC] bg-white'} rounded p-2 text-sm text-center`} /></div>
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
            {fields.length === 0 && <p className="text-xs text-[#8E8D8A] italic">Sin piedras. Haz clic en "Agregar Piedra" para incluir.</p>}
          </div>
        </section>

        {/* Precio */}
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-4">Precio</h3>

          <div className="flex justify-between text-sm text-[#333333]">
            <span>Precio base:</span>
            <span>${(Number(modelBasePrice) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm text-[#333333]">
            <span>Subtotal piedras:</span>
            <span>${totalStonesPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-[#333333] pt-2 border-t border-[#F5F2EE]">
            <span>Subtotal (sin redondeo):</span>
            <span className="text-[#C5B358]">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="pt-3 border-t border-[#F5F2EE]">
            <label className="block text-sm text-[#333333] mb-1">Precio Final de Venta ($)</label>
            <input
              type="number" step="0.01"
              {...register("finalClientPrice", { valueAsNumber: true })}
              className="w-full border border-[#D8D3CC] rounded p-2 text-lg text-[#C5B358] font-bold focus:outline-none focus:border-[#C5B358]"
              placeholder="0.00"
            />
            <p className="text-xs text-[#8E8D8A] mt-1">Precio final sin redondeo comercial automático</p>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSaving} className="bg-[#333333] hover:bg-black text-white px-8 py-3 rounded-md text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50">
            {isSaving ? "Guardando..." : "Crear Cotización Stock"}
          </button>
        </div>
      </form>
    </div>
  )
}
