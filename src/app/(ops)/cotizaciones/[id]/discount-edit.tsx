"use client"

import { useState } from "react"
import { updateQuotationDiscount } from "./actions"

export default function DiscountEdit({ id, initialDiscount, isConverted }: { id: string, initialDiscount: number, isConverted: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(initialDiscount)
  const [isSaving, setIsSaving] = useState(false)

  if (isConverted) {
    return initialDiscount > 0 ? (
      <div className="flex justify-between text-red-500 font-medium text-sm">
        <span>Descuento Aplicado:</span>
        <span>-{initialDiscount}%</span>
      </div>
    ) : null;
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateQuotationDiscount(id, discountPercent)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      alert("Error al actualizar el descuento.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8D3CC] text-sm">
        <label className="text-sm text-[#333333] font-medium">Descuento (%)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
            min="0" max="100" step="0.1"
            className="w-16 border border-[#D8D3CC] rounded p-1 text-sm text-right focus:outline-none focus:border-[#C5B358]"
          />
          <button onClick={handleSave} disabled={isSaving} className="text-xs bg-[#C5B358] text-white px-2 py-1 rounded hover:bg-[#b0a04f] transition-colors">Guardar</button>
          <button onClick={() => { setIsEditing(false); setDiscountPercent(initialDiscount); }} disabled={isSaving} className="text-xs text-[#8E8D8A] hover:text-[#333333]">Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-between text-sm items-center mt-2 pt-2 border-t border-[#D8D3CC]">
      <span className={initialDiscount > 0 ? "text-red-500 font-medium" : "text-[#8E8D8A]"}>
        {initialDiscount > 0 ? `Descuento Aplicado (${initialDiscount}%)` : "Sin descuento aplicado"}
      </span>
      <button onClick={() => setIsEditing(true)} className="text-[10px] uppercase text-[#C5B358] hover:text-[#b0a04f] font-semibold tracking-wider">
        {initialDiscount > 0 ? "Modificar" : "Agregar Descuento"}
      </button>
    </div>
  )
}
