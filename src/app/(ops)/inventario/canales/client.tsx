"use client"

import { useState } from "react"
import { Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"
import { createChannel, toggleChannel, deleteChannel } from "./actions"

type Channel = { id: string; name: string; activeStatus: boolean }

export default function CanalesClient({ channels: initialChannels }: { channels: Channel[] }) {
  const [channels, setChannels] = useState(initialChannels)
  const [newName, setNewName] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsAdding(true); setError(null)
    try {
      await createChannel(newName.trim())
      setChannels(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), activeStatus: true }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
    } catch (e: any) { setError(e.message) }
    finally { setIsAdding(false) }
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleChannel(id, !current)
    setChannels(prev => prev.map(c => c.id === id ? { ...c, activeStatus: !current } : c))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este canal? Las cotizaciones existentes conservarán el valor guardado.")) return
    await deleteChannel(id)
    setChannels(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-6 border-b border-[#D8D3CC]">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Canales de Venta</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Gestiona los canales disponibles para cotizaciones y órdenes.</p>
        </div>
      </div>

      {/* Agregar nuevo canal */}
      <div className="bg-white border border-[#D8D3CC] rounded-lg p-4 flex gap-3 items-end shadow-sm">
        <div className="flex-1">
          <label className="block text-sm font-medium text-[#333333] mb-1">Nuevo canal</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Ej. Pinterest, Referido..."
            className="w-full border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding || !newName.trim()}
          className="flex items-center gap-2 bg-[#333333] hover:bg-black text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          {isAdding ? "Agregando..." : "Agregar"}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded">{error}</div>}

      {/* Lista de canales */}
      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium text-left">Canal</th>
              <th className="px-6 py-3 font-medium text-center">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {channels.map(c => (
              <tr key={c.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#333333]">{c.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${c.activeStatus ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {c.activeStatus ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleToggle(c.id, c.activeStatus)}
                      className="text-[#8E8D8A] hover:text-[#333333] transition-colors"
                      title={c.activeStatus ? 'Desactivar' : 'Activar'}
                    >
                      {c.activeStatus ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-[#8E8D8A] hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-[#8E8D8A]">No hay canales registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
