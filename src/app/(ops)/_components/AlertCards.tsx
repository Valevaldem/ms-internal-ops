"use client"

import { useState } from "react"
import { Clock, FileWarning, CheckCircle2, Star, X, Phone, User, Tag, Gem, Calendar, AlertCircle } from "lucide-react"

type Stone = {
  stoneName: string
  lotCode: string
  quantity: number
  weightCt: number
  pricingMode: string
  stoneSubtotal: number
}

type Quotation = {
  id: string
  folio: string | null
  clientNameOrUsername: string
  phoneNumber: string | null
  pieceType: string
  modelName: string | null
  salesChannel: string
  status: string
  finalClientPrice: number
  validUntil: string
  notes: string | null
  salesAssociate: { name: string } | null
  stones: Stone[]
}

type Order = {
  id: string
  stage: string
  isPriority: boolean
  productionTiming: string | null
  paymentStatus: string
  quotation: Quotation
}

type ModalData =
  | { type: 'quotation'; data: Quotation }
  | { type: 'order'; data: Order }
  | null

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function QuotationDetail({ q }: { q: Quotation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-[#333333]">
          <User size={14} className="text-[#8E8D8A] shrink-0" />
          <span className="font-medium">{q.clientNameOrUsername}</span>
        </div>
        {q.phoneNumber && (
          <div className="flex items-center gap-2 text-[#333333]">
            <Phone size={14} className="text-[#8E8D8A] shrink-0" />
            <span>{q.phoneNumber}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[#333333]">
          <Tag size={14} className="text-[#8E8D8A] shrink-0" />
          <span>{q.salesChannel}</span>
        </div>
        <div className="flex items-center gap-2 text-[#333333]">
          <Calendar size={14} className="text-[#8E8D8A] shrink-0" />
          <span>Vence: {formatDate(q.validUntil)}</span>
        </div>
      </div>

      <div className="bg-[#F5F2EE] rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[#8E8D8A]">Tipo de pieza</span>
          <span className="font-medium">{q.pieceType}</span>
        </div>
        {q.modelName && (
          <div className="flex justify-between">
            <span className="text-[#8E8D8A]">Modelo</span>
            <span className="font-medium">{q.modelName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#8E8D8A]">Asesora</span>
          <span className="font-medium">{q.salesAssociate?.name || "—"}</span>
        </div>
        <div className="flex justify-between border-t border-[#D8D3CC] pt-2 mt-2">
          <span className="text-[#8E8D8A]">Estado</span>
          <span className="font-medium">{q.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8E8D8A]">Precio final</span>
          <span className="font-semibold text-[#C5B358]">{formatPrice(q.finalClientPrice)}</span>
        </div>
      </div>

      {q.stones.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Gem size={12} /> Piedras ({q.stones.length})
          </p>
          <div className="space-y-1">
            {q.stones.map((s, i) => (
              <div key={i} className="flex justify-between text-sm bg-[#F5F2EE] rounded px-3 py-2">
                <span className="text-[#333333]">
                  {s.stoneName}
                  <span className="text-[#8E8D8A] text-xs ml-1">({s.lotCode})</span>
                  {s.pricingMode === "PZ"
                    ? <span className="text-[#8E8D8A] text-xs ml-1">× {s.quantity} pz</span>
                    : <span className="text-[#8E8D8A] text-xs ml-1">{s.weightCt} CT</span>
                  }
                </span>
                <span className="text-[#333333] font-medium">{formatPrice(s.stoneSubtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {q.notes && (
        <div className="text-sm text-[#8E8D8A] italic border-l-2 border-[#D8D3CC] pl-3">
          {q.notes}
        </div>
      )}
    </div>
  )
}

function OrderDetail({ o }: { o: Order }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#F5F2EE] rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[#8E8D8A]">Etapa</span>
          <span className="font-medium">{o.stage}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8E8D8A]">Timing</span>
          <span className="font-medium">{o.productionTiming || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8E8D8A]">Pago</span>
          <span className="font-medium">{o.paymentStatus}</span>
        </div>
        {o.isPriority && (
          <div className="flex justify-between">
            <span className="text-[#8E8D8A]">Prioridad</span>
            <span className="font-semibold text-yellow-600">⭐ Prioritaria</span>
          </div>
        )}
      </div>
      <QuotationDetail q={o.quotation} />
    </div>
  )
}

function DetailModal({ modal, onClose }: { modal: ModalData; onClose: () => void }) {
  if (!modal) return null

  const title = modal.type === 'quotation'
    ? (modal.data.folio || modal.data.id)
    : (modal.data.quotation.folio || modal.data.id)

  const subtitle = modal.type === 'quotation'
    ? modal.data.clientNameOrUsername
    : modal.data.quotation.clientNameOrUsername

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#D8D3CC] sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-semibold text-[#333333] text-base">{title}</h3>
            <p className="text-sm text-[#8E8D8A] mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E8D8A] hover:text-[#333333] transition-colors ml-4 mt-0.5 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {modal.type === 'quotation'
            ? <QuotationDetail q={modal.data} />
            : <OrderDetail o={modal.data} />
          }
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <a
            href={modal.type === 'quotation'
              ? `/cotizaciones/${modal.data.id}`
              : `/cotizaciones/${modal.data.quotation.id}`
            }
            className="block w-full text-center bg-[#333333] hover:bg-black text-white text-sm py-2.5 rounded-md font-medium transition-colors uppercase tracking-wider"
          >
            Ver cotización completa →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AlertCards({
  priorityOrders,
  expiringQuotations,
  stonesToReturn,
  pendingFollowUps,
}: {
  priorityOrders: Order[]
  expiringQuotations: Quotation[]
  stonesToReturn: Quotation[]
  pendingFollowUps: Order[]
}) {
  const [modal, setModal] = useState<ModalData>(null)

  return (
    <>
      <DetailModal modal={modal} onClose={() => setModal(null)} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Órdenes Prioritarias */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star className="text-yellow-600" size={20} />
            <h3 className="font-semibold text-yellow-900">Órdenes Prioritarias</h3>
          </div>
          {priorityOrders.length === 0 ? (
            <p className="text-sm text-yellow-700/70">No hay órdenes prioritarias activas.</p>
          ) : (
            <ul className="space-y-3">
              {priorityOrders.map(o => (
                <li key={o.id} className="text-sm">
                  <button
                    onClick={() => setModal({ type: 'order', data: o })}
                    className="text-yellow-800 hover:underline font-medium text-left"
                  >
                    {o.quotation.folio || o.id}
                  </button>
                  <span className="text-yellow-700 ml-2">({o.quotation.clientNameOrUsername})</span>
                  <div className="text-yellow-600 text-xs mt-1">{o.stage}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cotizaciones por Expirar */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-amber-600" size={20} />
            <h3 className="font-semibold text-amber-900">Cotizaciones por Expirar</h3>
          </div>
          {expiringQuotations.length === 0 ? (
            <p className="text-sm text-amber-700/70">No hay cotizaciones próximas a expirar.</p>
          ) : (
            <ul className="space-y-3">
              {expiringQuotations.map(q => (
                <li key={q.id} className="text-sm">
                  <button
                    onClick={() => setModal({ type: 'quotation', data: q })}
                    className="text-amber-800 hover:underline font-medium text-left"
                  >
                    {q.folio || q.id}
                  </button>
                  <span className="text-amber-700 ml-2">({q.clientNameOrUsername})</span>
                  <div className="text-amber-600 text-xs mt-1">Vence: {formatDate(q.validUntil)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Piedras por Devolver */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning className="text-purple-600" size={20} />
            <h3 className="font-semibold text-purple-900">Piedras por Devolver</h3>
          </div>
          {stonesToReturn.length === 0 ? (
            <p className="text-sm text-purple-700/70">Todo en orden.</p>
          ) : (
            <ul className="space-y-3">
              {stonesToReturn.map(q => (
                <li key={q.id} className="text-sm">
                  <button
                    onClick={() => setModal({ type: 'quotation', data: q })}
                    className="text-purple-800 hover:underline font-medium text-left"
                  >
                    {q.folio || q.id}
                  </button>
                  <span className="text-purple-700 ml-2">({q.clientNameOrUsername})</span>
                  <div className="text-purple-600 text-xs mt-1">Vencida: {formatDate(q.validUntil)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Seguimientos Post-Venta */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-blue-600" size={20} />
            <h3 className="font-semibold text-blue-900">Seguimientos Post-Venta</h3>
          </div>
          {pendingFollowUps.length === 0 ? (
            <p className="text-sm text-blue-700/70">No hay seguimientos pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {pendingFollowUps.map(o => (
                <li key={o.id} className="text-sm">
                  <button
                    onClick={() => setModal({ type: 'order', data: o })}
                    className="text-blue-800 hover:underline font-medium text-left"
                  >
                    {o.quotation.folio || o.id}
                  </button>
                  <span className="text-blue-700 ml-2">({o.quotation.clientNameOrUsername})</span>
                  <div className="text-blue-600 text-xs mt-1">{o.stage}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </>
  )
}
