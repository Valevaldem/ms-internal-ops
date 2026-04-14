"use client"

import { useState } from "react"
import { Plus, Trash2, CheckSquare, Square } from "lucide-react"
import { createManualCertRequest, toggleManualCertField, deleteManualCertRequest } from "./actions"

type Stone = { stoneName: string; weightCt: string; assignedName: string }

type Request = {
  id: string
  folio: string | null
  clientName: string
  invoiceNumber: string | null
  pieceDescription: string
  advisorName: string
  certificateTitle: string | null
  stonesData: string | null
  certificateVinylReady: boolean
  certificatePhotoReady: boolean
  certificatePrintedReady: boolean
  certificateDeliveredToAdvisor: boolean
  status: string
  createdAt: Date
}

const emptyForm = {
  clientName: '', invoiceNumber: '', pieceDescription: '',
  advisorName: '', certificateTitle: '',
}

export default function ManualCertClient({ requests: initial }: { requests: Request[] }) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [stones, setStones] = useState<Stone[]>([])

  const addStone = () => setStones(prev => [...prev, { stoneName: '', weightCt: '', assignedName: '' }])
  const removeStone = (i: number) => setStones(prev => prev.filter((_, idx) => idx !== i))
  const updateStone = (i: number, field: keyof Stone, value: string) => {
    setStones(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const handleCreate = async () => {
    if (!form.clientName || !form.pieceDescription || !form.advisorName) return
    setIsSaving(true)
    try {
      await createManualCertRequest({ ...form, stonesData: stones.filter(s => s.stoneName) })
      setForm(emptyForm)
      setStones([])
      setShowForm(false)
      window.location.reload()
    } finally { setIsSaving(false) }
  }

  const handleToggle = async (id: string, field: string, current: boolean) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, [field]: !current } : r))
    await toggleManualCertField(id, field, !current)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta solicitud?")) return
    setRequests(prev => prev.filter(r => r.id !== id))
    await deleteManualCertRequest(id)
  }

  const CheckBtn = ({ id, field, value, label }: { id: string; field: string; value: boolean; label: string }) => (
    <button onClick={() => handleToggle(id, field, value)}
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${value ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-[#D8D3CC] text-[#8E8D8A] hover:bg-[#F5F2EE]'}`}>
      {value ? <CheckSquare size={13} /> : <Square size={13} />}
      {label}
    </button>
  )

  const pendientes = requests.filter(r => !r.certificateDeliveredToAdvisor)
  const completadas = requests.filter(r => r.certificateDeliveredToAdvisor)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b border-[#D8D3CC]">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Certificados Manuales</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Solicitudes sin orden de producción</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#333333] hover:bg-black text-white px-4 py-2 rounded-md text-sm transition-colors">
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#F5F2EE] border border-[#D8D3CC] rounded-lg p-5 space-y-5">
          <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider border-b border-[#D8D3CC] pb-2">Nueva Solicitud de Certificado</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Nombre de cliente *</label>
              <input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Número de Invoice <span className="normal-case text-[#8E8D8A] font-normal">(opcional)</span></label>
              <input value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Ej. INV-2024-001" />
            </div>
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Descripción de pieza *</label>
              <input value={form.pieceDescription} onChange={e => setForm(p => ({ ...p, pieceDescription: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Ej. Anillo solitario 14k" />
            </div>
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Asesora *</label>
              <input value={form.advisorName} onChange={e => setForm(p => ({ ...p, advisorName: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Nombre de la asesora" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Título del certificado</label>
              <input value={form.certificateTitle} onChange={e => setForm(p => ({ ...p, certificateTitle: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Apellido(s) de la familia" />
            </div>
          </div>

          {/* Piedras */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs text-[#8E8D8A] uppercase tracking-wider font-semibold">Piedras</label>
              <button type="button" onClick={addStone}
                className="flex items-center gap-1.5 text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors">
                <Plus size={14} /> Agregar piedra
              </button>
            </div>
            <div className="space-y-2">
              {stones.map((s, i) => (
                <div key={i} className="bg-white border border-[#D8D3CC] rounded-md p-3 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-xs font-semibold text-[#8E8D8A] text-center">{i + 1}</div>
                  <div className="col-span-4">
                    <input value={s.stoneName} onChange={e => updateStone(i, 'stoneName', e.target.value)}
                      className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
                      placeholder="Nombre de piedra" />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <input value={s.weightCt} onChange={e => updateStone(i, 'weightCt', e.target.value)}
                        className="w-full border border-[#D8D3CC] rounded p-2 text-sm pr-8 focus:outline-none focus:border-[#C5B358]"
                        placeholder="0.00" type="number" step="0.01" min="0" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8E8D8A]">ct</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <input value={s.assignedName} onChange={e => updateStone(i, 'assignedName', e.target.value)}
                      className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
                      placeholder="Nota / nombre asignado" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeStone(i)} className="text-[#8E8D8A] hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {stones.length === 0 && (
                <p className="text-xs text-[#8E8D8A] italic text-center py-3 bg-white border border-dashed border-[#D8D3CC] rounded-md">
                  Sin piedras — haz clic en "Agregar piedra"
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#D8D3CC]">
            <button onClick={() => { setShowForm(false); setStones([]) }}
              className="text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors">Cancelar</button>
            <button onClick={handleCreate}
              disabled={isSaving || !form.clientName || !form.pieceDescription || !form.advisorName}
              className="bg-[#C5B358] hover:bg-[#b0a04f] text-white px-6 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50">
              {isSaving ? "Guardando..." : "Crear Solicitud"}
            </button>
          </div>
        </div>
      )}

      {/* Pendientes */}
      {pendientes.length > 0 ? (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[#F5F2EE] px-6 py-3 border-b border-[#D8D3CC]">
            <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">Pendientes ({pendientes.length})</h3>
          </div>
          <div className="divide-y divide-[#F5F2EE]">
            {pendientes.map(r => {
              const stonesArr: Stone[] = r.stonesData ? JSON.parse(r.stonesData) : []
              return (
                <div key={r.id} className="p-5 hover:bg-[#F5F2EE]/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-[#333333]">{r.folio}</span>
                        {r.invoiceNumber && <span className="text-xs bg-[#F5F2EE] border border-[#D8D3CC] text-[#8E8D8A] px-2 py-0.5 rounded">Invoice: {r.invoiceNumber}</span>}
                      </div>
                      <div className="text-sm text-[#333333]">{r.clientName} <span className="text-[#8E8D8A]">— {r.advisorName}</span></div>
                      <div className="text-xs text-[#8E8D8A] mt-0.5">{r.pieceDescription}</div>
                      {r.certificateTitle && <div className="text-xs text-[#C5B358] font-medium mt-1">Título: {r.certificateTitle}</div>}

                      {/* Piedras */}
                      {stonesArr.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {stonesArr.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs bg-[#F5F2EE] px-3 py-1.5 rounded border border-[#D8D3CC]">
                              <span className="text-[#8E8D8A] font-medium">Piedra {i + 1}:</span>
                              <span className="font-medium text-[#333333]">{s.stoneName}</span>
                              {s.weightCt && <span className="text-[#8E8D8A]">— {s.weightCt} ct</span>}
                              {s.assignedName && <span className="text-[#C5B358]">— {s.assignedName}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="text-[#8E8D8A] hover:text-red-500 transition-colors ml-4 mt-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <CheckBtn id={r.id} field="certificateVinylReady" value={r.certificateVinylReady} label="Vinil/Título" />
                    <CheckBtn id={r.id} field="certificatePhotoReady" value={r.certificatePhotoReady} label="Foto" />
                    <CheckBtn id={r.id} field="certificatePrintedReady" value={r.certificatePrintedReady} label="Impreso" />
                    <CheckBtn id={r.id} field="certificateDeliveredToAdvisor" value={r.certificateDeliveredToAdvisor} label="✓ Entregado a asesora" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#D8D3CC] rounded-lg p-10 text-center text-sm text-[#8E8D8A]">
          No hay solicitudes pendientes.
        </div>
      )}

      {/* Completadas */}
      {completadas.length > 0 && (
        <div className="mt-6 opacity-75">
          <h3 className="text-lg font-serif text-[#333333] mb-3">Completadas ({completadas.length})</h3>
          <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm divide-y divide-[#F5F2EE]">
            {completadas.map(r => (
              <div key={r.id} className="px-5 py-3 flex justify-between items-center hover:bg-[#F5F2EE]/30">
                <div>
                  <span className="font-medium text-[#333333] text-sm">{r.folio}</span>
                  <span className="text-[#8E8D8A] text-sm ml-2">— {r.clientName}</span>
                  <span className="text-xs text-[#8E8D8A] ml-2">{r.pieceDescription}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">✓ Entregado</span>
                  <button onClick={() => handleDelete(r.id)} className="text-[#8E8D8A] hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
