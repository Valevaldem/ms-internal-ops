"use client"

import { useState } from "react"
import { Plus, ToggleLeft, ToggleRight, Trash2, Pencil, Check, X } from "lucide-react"
import { createSupplier, toggleSupplier, deleteSupplier, renameSupplier } from "./actions"

type Supplier = { id: string; name: string; activeStatus: boolean }

export default function ProveedoresClient({ suppliers: initialSuppliers }: { suppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [newName, setNewName] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsAdding(true); setError(null)
    try {
      await createSupplier(newName.trim())
      setSuppliers(prev =>
        [...prev, { id: Date.now().toString(), name: newName.trim(), activeStatus: true }]
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewName("")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleSupplier(id, !current)
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, activeStatus: !current } : s))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este proveedor? Si tiene pedidos vinculados se desactivará en vez de borrarse.")) return
    try {
      await deleteSupplier(id)
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const startEdit = (s: Supplier) => {
    setEditingId(s.id)
    setEditingName(s.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return
    try {
      await renameSupplier(id, editingName.trim())
      setSuppliers(prev =>
        prev.map(s => s.id === id ? { ...s, name: editingName.trim() } : s)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      cancelEdit()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-6 border-b border-[#D8D3CC]">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Proveedores</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Proveedores disponibles para pedidos de stock.</p>
        </div>
      </div>

      {/* Agregar proveedor */}
      <div className="bg-white border border-[#D8D3CC] rounded-lg p-4 flex gap-3 items-end shadow-sm">
        <div className="flex-1">
          <label className="block text-sm font-medium text-[#333333] mb-1">Nuevo proveedor</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Ej. Joyería del Sol, Taller Palacio..."
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

      {/* Lista */}
      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium text-left">Proveedor</th>
              <th className="px-6 py-3 font-medium text-center">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {suppliers.map(s => (
              <tr key={s.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#333333]">
                  {editingId === s.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(s.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                      className="w-full border border-[#D8D3CC] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#C5B358]"
                    />
                  ) : (
                    s.name
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${s.activeStatus ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {s.activeStatus ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {editingId === s.id ? (
                      <>
                        <button onClick={() => saveEdit(s.id)} className="text-green-600 hover:text-green-700" title="Guardar">
                          <Check size={18} />
                        </button>
                        <button onClick={cancelEdit} className="text-[#8E8D8A] hover:text-red-500" title="Cancelar">
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(s)} className="text-[#8E8D8A] hover:text-[#333333] transition-colors" title="Editar nombre">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggle(s.id, s.activeStatus)}
                          className="text-[#8E8D8A] hover:text-[#333333] transition-colors"
                          title={s.activeStatus ? 'Desactivar' : 'Activar'}
                        >
                          {s.activeStatus ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-[#8E8D8A] hover:text-red-500 transition-colors" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-[#8E8D8A]">No hay proveedores registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
