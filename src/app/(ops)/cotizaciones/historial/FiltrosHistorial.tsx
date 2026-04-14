"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import SalesChannelFilter from "@/components/SalesChannelFilter"

interface Props {
  tab: string
  view: string
  sort: string
  search: string
  startDate: string
  endDate: string
  salesChannel: string
  isManager: boolean
}

export default function FiltrosHistorial({ tab, view, sort, search, startDate, endDate, salesChannel, isManager }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [searchInput, setSearchInput] = useState(search)

  const pushUrl = useCallback((overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    const current: Record<string, string> = { tab, view, sort, search: searchInput, startDate, endDate, salesChannel }
    const merged = { ...current, ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    router.push(`${pathname}?${p.toString()}`)
  }, [tab, view, sort, searchInput, startDate, endDate, salesChannel, router, pathname])

  // Debounce del buscador de texto (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) pushUrl({ search: searchInput })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  return (
    <div className="flex flex-wrap gap-3 items-end mb-2">
      {/* Buscador */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Buscar</label>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Folio, cliente, asesora..."
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
        />
      </div>

      {/* Desde */}
      <div className="w-36">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Desde</label>
        <input
          type="date"
          defaultValue={startDate}
          onChange={(e) => pushUrl({ startDate: e.target.value })}
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
        />
      </div>

      {/* Hasta */}
      <div className="w-36">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Hasta</label>
        <input
          type="date"
          defaultValue={endDate}
          onChange={(e) => pushUrl({ endDate: e.target.value })}
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
        />
      </div>

      {/* Sort */}
      <div className="w-44">
        <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Ordenar por</label>
        <select
          defaultValue={sort}
          onChange={(e) => pushUrl({ sort: e.target.value })}
          className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
        >
          <option value="date_desc">Más reciente primero</option>
          <option value="date_asc">Más antiguo primero</option>
          <option value="price_desc">Precio mayor primero</option>
          <option value="price_asc">Precio menor primero</option>
          <option value="client_asc">Cliente A-Z</option>
        </select>
      </div>

      {/* Canal (solo manager) */}
      {isManager && (
        <div>
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Canal</label>
          <select
            defaultValue={salesChannel}
            onChange={(e) => pushUrl({ salesChannel: e.target.value })}
            className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
          >
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

      {/* Limpiar */}
      {(searchInput || startDate || endDate || salesChannel) && (
        <button
          type="button"
          onClick={() => { setSearchInput(""); pushUrl({ search: "", startDate: "", endDate: "", salesChannel: "" }) }}
          className="text-sm text-[#8E8D8A] hover:text-[#333333] underline px-2 py-2"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
