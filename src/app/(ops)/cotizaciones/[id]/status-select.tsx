"use client"

import { updateQuotationStatus } from "./actions"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function StatusSelect({ id, currentStatus }: { id: string, currentStatus: string }) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setIsUpdating(true)
    try {
      await updateQuotationStatus(id, newStatus)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert("Error al actualizar el estado.")
    } finally {
      setIsUpdating(false)
    }
  }

  // Si ya es una orden convertida, no permitimos cambiar de estado
  if (currentStatus === "Converted" || currentStatus === "Convertida") {
    return <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded uppercase font-semibold">Convertida a Orden</span>
  }

  return (
    <select
      disabled={isUpdating}
      value={currentStatus}
      onChange={handleStatusChange}
      className={`text-xs px-2 py-1 rounded border border-[#D8D3CC] focus:outline-none focus:border-[#C5B358] bg-white ${isUpdating ? "opacity-50" : ""}`}
    >
      <option value="Pendiente de respuesta">Pendiente de respuesta</option>
      <option value="En seguimiento">En seguimiento</option>
      <option value="Oportunidad de cierre">Oportunidad de cierre</option>
      <option value="Declinada">Declinada</option>
    </select>
  )
}
