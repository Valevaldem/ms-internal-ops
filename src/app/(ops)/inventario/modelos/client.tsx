"use client"

import { useState } from "react"
import { Search, Plus, Edit, CheckCircle, XCircle } from "lucide-react"
import { createModel, updateModel } from "./actions"
import { translatePieceType } from "@/lib/translations"

type Model = {
  id: string
  name: string
  pieceType: string
  basePrice: number
  activeStatus: boolean
  createdAt: Date
  updatedAt: Date
}

type PieceType = {
  id: string
  name: string
}

export default function ModelosClient({ models, pieceTypes }: { models: Model[], pieceTypes: PieceType[] }) {
  const [search, setSearch] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    pieceType: pieceTypes[0]?.name || "Ring",
    basePrice: 0,
    activeStatus: true,
  })

  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(search.toLowerCase()) ||
    translatePieceType(model.pieceType).toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenNew = () => {
    setEditingModel(null)
    setFormData({
      name: "",
      pieceType: pieceTypes[0]?.name || "Ring",
      basePrice: 0,
      activeStatus: true,
    })
    setErrors({})
    setSubmitError(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (model: Model) => {
    setEditingModel(model)
    setFormData({
      name: model.name,
      pieceType: model.pieceType,
      basePrice: model.basePrice,
      activeStatus: model.activeStatus,
    })
    setErrors({})
    setSubmitError(null)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingModel(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: [] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        ...formData,
        basePrice: parseFloat(formData.basePrice.toString()),
      }

      const result = editingModel
        ? await updateModel(editingModel.id, payload)
        : await createModel(payload)

      if (result.success) {
        handleCloseForm()
      } else if (result.errors) {
        setErrors(result.errors)
      } else {
        setSubmitError(result.error || "Error desconocido")
      }
    } catch (error) {
      setSubmitError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b border-[#D8D3CC]">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Modelos Base</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">
            Gestiona los precios base de los modelos para nuevas cotizaciones.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-[#333333] hover:bg-black text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            <Plus size={16} />
            Nuevo Modelo
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#D8D3CC] bg-[#F9F8F6] flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8D8A]" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o tipo de pieza..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#D8D3CC] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8E8D8A] uppercase bg-[#F5F2EE] border-b border-[#D8D3CC]">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-md">Nombre</th>
                <th className="px-4 py-3 font-semibold">Tipo de Pieza</th>
                <th className="px-4 py-3 font-semibold">Precio Base</th>
                <th className="px-4 py-3 font-semibold text-center">Estado</th>
                <th className="px-4 py-3 font-semibold">Última Act.</th>
                <th className="px-4 py-3 font-semibold text-right rounded-tr-md">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D3CC]">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <tr key={model.id} className="hover:bg-[#F9F8F6] transition-colors">
                    <td className="px-4 py-4 font-medium text-[#333333]">{model.name}</td>
                    <td className="px-4 py-4 text-[#555555]">{model.pieceType}</td>
                    <td className="px-4 py-4 text-[#555555]">${model.basePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-center">
                      {model.activeStatus ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8F3EB] text-[#2E6B41]">
                          <CheckCircle size={12} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F2EE] text-[#8E8D8A]">
                          <XCircle size={12} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#8E8D8A] text-xs">
                      {new Date(model.updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(model)}
                        className="text-[#8E8D8A] hover:text-[#C5B358] transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8E8D8A]">
                    No se encontraron modelos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-[#D8D3CC] sticky top-0 bg-white z-10">
              <h3 className="text-xl font-serif text-[#333333]">
                {editingModel ? "Editar Modelo" : "Nuevo Modelo"}
              </h3>
              <button onClick={handleCloseForm} className="text-[#8E8D8A] hover:text-[#333333]">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Nombre del Modelo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.name ? "border-red-500" : "border-[#D8D3CC]"}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#555555] mb-1">
                      Tipo de Pieza
                    </label>
                    <select
                      name="pieceType"
                      value={formData.pieceType}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.pieceType ? "border-red-500" : "border-[#D8D3CC]"}`}
                    >
                      {pieceTypes.map(pt => (
                        <option key={pt.id} value={pt.name}>{pt.name}</option>
                      ))}
                      {editingModel && !pieceTypes.some(pt => pt.name === editingModel.pieceType) && (
                        <option value={editingModel.pieceType}>{editingModel.pieceType}</option>
                      )}
                    </select>
                    {errors.pieceType && <p className="text-red-500 text-xs mt-1">{errors.pieceType[0]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#555555] mb-1">
                      Precio Base
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8D8A]">$</span>
                      <input
                        type="number"
                        name="basePrice"
                        min="0"
                        step="0.01"
                        value={formData.basePrice}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.basePrice ? "border-red-500" : "border-[#D8D3CC]"}`}
                      />
                    </div>
                    {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice[0]}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeStatus"
                  name="activeStatus"
                  checked={formData.activeStatus}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#C5B358] border-[#D8D3CC] rounded focus:ring-[#C5B358]"
                />
                <label htmlFor="activeStatus" className="text-sm text-[#555555] font-medium">
                  Modelo Activo (Disponible en cotizaciones)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[#D8D3CC] sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-sm text-[#555555] bg-[#F5F2EE] hover:bg-[#EAE6DF] rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-white bg-[#333333] hover:bg-[#4A4A4A] rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Modelo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
