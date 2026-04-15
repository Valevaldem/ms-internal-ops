"use client"

import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface Props {
  tab: string; view: string; sort: string; search: string
  startDate: string; endDate: string; salesChannel: string
  isManager: boolean; status?: string
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente de respuesta", label: "Pendiente de respuesta" },
  { value: "En seguimiento", label: "En seguimiento" },
  { value: "Oportunidad de cierre", label: "Oportunidad de cierre" },
  { value: "Declinada", label: "Declinada" },
]

export default function FiltrosHistorial({ tab, view, sort, search, startDate, endDate, salesChannel, isManager, status = "" }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchInput, setSearchInput] = useState(search)

  const pushUrl = useCallback((overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    const current: Record<string, string> = { tab, view, sort, search: searchInput, startDate, endDate, salesChannel, statusFilter: status }
    const merged = { ...current, ...overrides }
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === "tab" && v === "active") && !(k === "view" && v === "grid") && !(k === "sort" && v === "date_desc")) p.set(k, v)
    })
    router.push(`${pathname}?${p.toString()}`)
  }, [tab, view, sort, searchInput, startDate, endDate, salesChannel, status, router, pathname])

  useEffect(() => {
    const timer = setTimeout(() => { if (searchInput !== search) pushUrl({ search: searchInput }) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const hasFilters = searchInput || startDate || endDate || salesChannel || status

  return (
    <div className="flex flex-wrap gap-3 items-end mb-2">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Buscar</label>
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Folio, cliente, asesora..."
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
      </div>

      {tab === "active" && (
        <div className="w-52">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Estado</label>
          <select value={status} onChange={(e) => pushUrl({ statusFilter: e.target.value })}
            className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      <div className="w-36">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Desde</label>
        <input type="date" defaultValue={startDate} onChange={(e) => pushUrl({ startDate: e.target.value })}
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
      </div>

      <div className="w-36">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Hasta</label>
        <input type="date" defaultValue={endDate} onChange={(e) => pushUrl({ endDate: e.target.value })}
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
      </div>

      <div className="w-44">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Ordenar por</label>
        <select defaultValue={sort} onChange={(e) => pushUrl({ sort: e.target.value })}
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]">
          <option value="date_desc">Más reciente</option>
          <option value="date_asc">Más antiguo</option>
          <option value="price_desc">Precio mayor</option>
          <option value="price_asc">Precio menor</option>
          <option value="client_asc">Cliente A-Z</option>
        </select>
      </div>

      {isManager && (
        <div className="w-40">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Canal</label>
          <select defaultValue={salesChannel} onChange={(e) => pushUrl({ salesChannel: e.target.value })}
            className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]">
            <option value="">Todos</option>
            <option value="Store">Tienda</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="TikTok">TikTok</option>
            <option value="Form">Formulario</option>
          </select>
        </div>
      )}

      {hasFilters && (
        <button type="button"
          onClick={() => { setSearchInput(""); pushUrl({ search: "", startDate: "", endDate: "", salesChannel: "", statusFilter: "" }) }}
          className="text-sm text-[#8E8D8A] hover:text-[#333333] underline px-2 py-2">
          Limpiar
        </button>
      )}
    </div>
  )
}
