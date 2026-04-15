"use client"

import { useState } from "react"
import { Search, Plus, Edit, CheckCircle, XCircle, Download, UploadCloud } from "lucide-react"
import { createStoneLot, updateStoneLot } from "./actions"
import ImportModal from "./ImportModal"
import Papa from "papaparse"

type StoneLot = {
  code: string
  stoneName: string
  cut: string
  color: string
  pricePerCt: number
  pricingMode: string
  ctPerPiece: number | null
  activeStatus: boolean
}

export default function StoneLotsClient({ lots }: { lots: StoneLot[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<StoneLot | null>(null)

  const [formData, setFormData] = useState<Partial<StoneLot>>({
    code: "",
    stoneName: "",
    cut: "",
    color: "",
    pricePerCt: 0,
    pricingMode: "CT",
    ctPerPiece: null,
    activeStatus: true,
  })

  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [ctPerPieceStr, setCtPerPieceStr] = useState("")

  const filteredLots = lots.filter(lot =>
    lot.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lot.stoneName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenCreate = () => {
    setEditingLot(null)
    setFormData({
      code: "",
      stoneName: "",
      cut: "",
      color: "",
      pricePerCt: 0,
      pricingMode: "CT",
      activeStatus: true,
    })
    setErrors({})
    setSubmitError(null)
    setCtPerPieceStr("")
    setIsFormOpen(true)
  }

  const handleOpenEdit = (lot: StoneLot) => {
    setEditingLot(lot)
    setFormData({ ...lot })
    setErrors({})
    setSubmitError(null)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingLot(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === "number") {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: [] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    setErrors({})

    try {
      if (editingLot) {
        const result = await updateStoneLot(editingLot.code, formData)
        if (!result.success) {
          if (result.errors) setErrors(result.errors)
          if (result.error) setSubmitError(result.error)
        } else {
          handleCloseForm()
        }
      } else {
        const result = await createStoneLot(formData)
        if (!result.success) {
          if (result.errors) setErrors(result.errors)
          if (result.error) setSubmitError(result.error)
        } else {
          handleCloseForm()
        }
      }
    } catch (_err) {
      setSubmitError("Ha ocurrido un error inesperado.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-light text-[#333333] tracking-wide font-serif mb-1">Catálogo de Lotes de Piedras</h2>
          <p className="text-sm text-[#8E8D8A]">Gestiona los lotes de piedras para las cotizaciones.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D8D3CC] text-[#555555] text-sm font-medium rounded-md hover:bg-[#F5F2EE] transition-colors"
          >
            <UploadCloud size={16} />
            Importar
          </button>
          <button
            onClick={() => {
              const csvData = lots.map(lot => ({
                "Código": lot.code,
                "Piedra": lot.stoneName,
                "Corte": lot.cut,
                "Color": lot.color,
                "Modo": lot.pricingMode,
                "Precio": lot.pricePerCt,
                "Activo": lot.activeStatus ? "Si" : "No"
              }))
              const csv = Papa.unparse(csvData)
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.setAttribute('download', `inventario_lotes_${new Date().toLocaleDateString('en-CA')}.csv`)
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D8D3CC] text-[#555555] text-sm font-medium rounded-md hover:bg-[#F5F2EE] transition-colors"
          >
            <Download size={16} />
            Exportar
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-[#333333] text-white px-4 py-2 rounded-md hover:bg-[#4A4A4A] transition-colors text-sm ml-2"
          >
            <Plus size={16} />
            Nuevo Lote
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-[#D8D3CC]">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8E8D8A]" size={18} />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#D8D3CC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-md">Código</th>
                <th className="px-4 py-3 font-semibold">Piedra</th>
                <th className="px-4 py-3 font-semibold">Corte</th>
                <th className="px-4 py-3 font-semibold">Color</th>
                <th className="px-4 py-3 font-semibold">Modo</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="px-4 py-3 font-semibold text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-right rounded-tr-md">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D3CC]">
              {filteredLots.length > 0 ? (
                filteredLots.map((lot) => (
                  <tr key={lot.code} className="hover:bg-[#F9F8F6] transition-colors">
                    <td className="px-4 py-4 font-medium text-[#333333]">{lot.code}</td>
                    <td className="px-4 py-4 text-[#555555]">{lot.stoneName}</td>
                    <td className="px-4 py-4 text-[#555555]">{lot.cut}</td>
                    <td className="px-4 py-4 text-[#555555]">{lot.color}</td>
                    <td className="px-4 py-4 text-[#555555]">{lot.pricingMode}</td>
                    <td className="px-4 py-4 text-[#555555]">${lot.pricePerCt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-center">
                      {lot.activeStatus ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8F3EB] text-[#2E6B41]">
                          <CheckCircle size={12} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F2EE] text-[#8E8D8A]">
                          <XCircle size={12} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(lot)}
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
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8E8D8A]">
                    No se encontraron lotes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-[#D8D3CC] sticky top-0 bg-white z-10">
              <h3 className="text-xl font-serif text-[#333333]">
                {editingLot ? "Editar Lote" : "Nuevo Lote"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Código de Lote
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    readOnly={!!editingLot}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${editingLot ? "bg-[#F5F2EE] text-[#8E8D8A] cursor-not-allowed" : "border-[#D8D3CC]"} ${errors.code ? "border-red-500" : ""}`}
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code[0]}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Nombre de la Piedra
                  </label>
                  <input
                    type="text"
                    name="stoneName"
                    value={formData.stoneName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.stoneName ? "border-red-500" : "border-[#D8D3CC]"}`}
                  />
                  {errors.stoneName && <p className="text-red-500 text-xs mt-1">{errors.stoneName[0]}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Corte
                  </label>
                  <input
                    type="text"
                    name="cut"
                    value={formData.cut}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.cut ? "border-red-500" : "border-[#D8D3CC]"}`}
                  />
                  {errors.cut && <p className="text-red-500 text-xs mt-1">{errors.cut[0]}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Color / Claridad
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.color ? "border-red-500" : "border-[#D8D3CC]"}`}
                  />
                  {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color[0]}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Modo de Precio
                  </label>
                  <select
                    name="pricingMode"
                    value={formData.pricingMode}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.pricingMode ? "border-red-500" : "border-[#D8D3CC]"}`}
                  >
                    <option value="CT">Por Quilate (CT)</option>
                    <option value="PZ">Por Pieza (PZ)</option>
                  </select>
                  {errors.pricingMode && <p className="text-red-500 text-xs mt-1">{errors.pricingMode[0]}</p>}
                </div>

                {formData.pricingMode === "PZ" && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-medium text-[#555555]">
                      Peso por pieza (CT) <span className="text-[#8E8D8A] font-normal text-xs">(solo para certificados — no afecta precio)</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-[#555555]">
                        <input type="radio" name="ctPerPieceMode" value="fixed"
                          checked={formData.ctPerPiece !== null && formData.ctPerPiece !== undefined}
                          onChange={() => { setCtPerPieceStr(""); setFormData(p => ({ ...p, ctPerPiece: 0.01 })); }}
                          className="text-[#C5B358]" />
                        Peso fijo por pieza
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-[#555555]">
                        <input type="radio" name="ctPerPieceMode" value="manual"
                          checked={formData.ctPerPiece === null || formData.ctPerPiece === undefined}
                          onChange={() => { setCtPerPieceStr(""); setFormData(p => ({ ...p, ctPerPiece: null })); }}
                          className="text-[#C5B358]" />
                        CT manual en cotización
                      </label>
                    </div>
                    {formData.ctPerPiece !== null && formData.ctPerPiece !== undefined && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ctPerPieceStr}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val)) {
                              setCtPerPieceStr(val);
                              const num = parseFloat(val);
                              setFormData(p => ({ ...p, ctPerPiece: isNaN(num) ? null : num }));
                            }
                          }}
                          className="w-28 px-3 py-2 border border-[#D8D3CC] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358]"
                          placeholder="0.03" />
                        <span className="text-sm text-[#8E8D8A]">CT por pieza</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#555555] mb-1">
                    Precio (según modo)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8D8A]">$</span>
                    <input
                      type="number"
                      name="pricePerCt"
                      min="0"
                      step="0.01"
                      value={formData.pricePerCt}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358] ${errors.pricePerCt ? "border-red-500" : "border-[#D8D3CC]"}`}
                    />
                  </div>
                  {errors.pricePerCt && <p className="text-red-500 text-xs mt-1">{errors.pricePerCt[0]}</p>}
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
                  Lote Activo (Disponible en cotizaciones)
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
                  {isSubmitting ? "Guardando..." : "Guardar Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingLots={lots}
        onSuccess={() => {
          // Revalidation happens on server, data will refresh automatically
        }}
      />
    </div>
  )
}
