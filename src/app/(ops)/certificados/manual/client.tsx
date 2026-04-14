"use client"

import { useState } from "react"
import { Plus, Trash2, CheckSquare, Square } from "lucide-react"
import { createManualCertRequest, toggleManualCertField, deleteManualCertRequest } from "./actions"

type Request = {
  id: string
  folio: string | null
  clientName: string
  pieceDescription: string
  advisorName: string
  notes: string | null
  certificateTitle: string | null
  certificateVinylReady: boolean
  certificatePhotoReady: boolean
  certificatePrintedReady: boolean
  certificateDeliveredToAdvisor: boolean
  certificateNeedsReview: boolean
  status: string
  createdAt: Date
}

export default function ManualCertClient({ requests: initial }: { requests: Request[] }) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    clientName: '', pieceDescription: '', advisorName: '', notes: '', certificateTitle: ''
  })

  const handleCreate = async () => {
    if (!form.clientName || !form.pieceDescription || !form.advisorName) return
    setIsSaving(true)
    try {
      await createManualCertRequest(form)
      setForm({ clientName: '', pieceDescription: '', advisorName: '', notes: '', certificateTitle: '' })
      setShowForm(false)
      // Refresh optimistically
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
    <button
      onClick={() => handleToggle(id, field, value)}
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${value ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-[#D8D3CC] text-[#8E8D8A] hover:bg-[#F5F2EE]'}`}
    >
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
          <p className="text-sm text-[#8E8D8A] mt-1">Solicitudes de certificado sin orden de producción</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#333333] hover:bg-black text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          <Plus size={16} />
          Nueva Solicitud
        </button>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <div className="bg-[#F5F2EE] border border-[#D8D3CC] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">Nueva Solicitud</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Cliente *</label>
              <input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Asesora *</label>
              <input value={form.advisorName} onChange={e => setForm(p => ({ ...p, advisorName: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Nombre de la asesora" />
            </div>
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Descripción de pieza *</label>
              <input value={form.pieceDescription} onChange={e => setForm(p => ({ ...p, pieceDescription: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Ej. Anillo solitario 14k con diamante 0.5ct" />
            </div>
            <div>
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Título del certificado</label>
              <input value={form.certificateTitle} onChange={e => setForm(p => ({ ...p, certificateTitle: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="Apellido(s) de la familia" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full border border-[#D8D3CC] bg-white rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="text-sm text-[#8E8D8A] hover:text-[#333333]">Cancelar</button>
            <button onClick={handleCreate} disabled={isSaving || !form.clientName || !form.pieceDescription || !form.advisorName}
              className="bg-[#C5B358] hover:bg-[#b0a04f] text-white px-5 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50">
              {isSaving ? "Guardando..." : "Crear Solicitud"}
            </button>
          </div>
        </div>
      )}

      {/* Lista pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[#F5F2EE] px-6 py-3 border-b border-[#D8D3CC]">
            <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">Pendientes ({pendientes.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider border-b border-[#D8D3CC]">
              <tr>
                <th className="px-6 py-3 font-medium text-left">Folio / Cliente</th>
                <th className="px-6 py-3 font-medium text-left">Pieza / Asesora</th>
                <th className="px-6 py-3 font-medium text-left">Título</th>
                <th className="px-6 py-3 font-medium text-left">Progreso</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {pendientes.map(r => (
                <tr key={r.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#333333]">{r.folio}</div>
                    <div className="text-xs text-[#8E8D8A] mt-0.5">{r.clientName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[#333333] text-sm">{r.pieceDescription}</div>
                    <div className="text-xs text-[#8E8D8A] mt-0.5">{r.advisorName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#333333]">{r.certificateTitle || <span className="italic text-[#8E8D8A]">Sin título</span>}</div>
                    {r.notes && <div className="text-xs text-[#8E8D8A] mt-0.5 italic">{r.notes}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <CheckBtn id={r.id} field="certificateVinylReady" value={r.certificateVinylReady} label="Vinil" />
                      <CheckBtn id={r.id} field="certificatePhotoReady" value={r.certificatePhotoReady} label="Foto" />
                      <CheckBtn id={r.id} field="certificatePrintedReady" value={r.certificatePrintedReady} label="Impreso" />
                      <CheckBtn id={r.id} field="certificateDeliveredToAdvisor" value={r.certificateDeliveredToAdvisor} label="Entregado" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-[#8E8D8A] hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendientes.length === 0 && (
        <div className="bg-white border border-[#D8D3CC] rounded-lg p-10 text-center text-sm text-[#8E8D8A]">
          No hay solicitudes pendientes.
        </div>
      )}

      {/* Completadas */}
      {completadas.length > 0 && (
        <div className="mt-8 opacity-70">
          <h3 className="text-lg font-serif text-[#333333] mb-3">Completadas ({completadas.length})</h3>
          <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[#F5F2EE]">
                {completadas.map(r => (
                  <tr key={r.id} className="hover:bg-[#F5F2EE]/50">
                    <td className="px-6 py-3">
                      <span className="font-medium text-[#333333]">{r.folio}</span>
                      <span className="text-[#8E8D8A] ml-2">— {r.clientName}</span>
                    </td>
                    <td className="px-6 py-3 text-[#8E8D8A] text-xs">{r.pieceDescription}</td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">✓ Entregado</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleDelete(r.id)} className="text-[#8E8D8A] hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
