"use client"

import { useState } from "react"
import { Clock, FileWarning, CheckCircle2, Star, X, Phone, User, Tag, Gem, Calendar } from "lucide-react"

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

type CardType = 'priority' | 'expiring' | 'stones' | 'followup' | null

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function QuotationRow({ q, onClick }: { q: Quotation; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-[#D8D3CC] hover:border-[#C5B358] hover:bg-[#F5F2EE] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-[#333333] text-sm">{q.folio || q.id}</span>
          <span className="text-[#8E8D8A] text-sm ml-2">{q.clientNameOrUsername}</span>
        </div>
        <span className="text-[#C5B358] font-semibold text-sm shrink-0">{formatPrice(q.finalClientPrice)}</span>
      </div>
      <div className="flex gap-3 mt-1 text-xs text-[#8E8D8A]">
        <span>{q.pieceType}</span>
        {q.modelName && <span>· {q.modelName}</span>}
        <span>· Vence {formatDate(q.validUntil)}</span>
      </div>
    </button>
  )
}

function OrderRow({ o, onClick }: { o: Order; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-[#D8D3CC] hover:border-[#C5B358] hover:bg-[#F5F2EE] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-[#333333] text-sm">{o.quotation.folio || o.id}</span>
          <span className="text-[#8E8D8A] text-sm ml-2">{o.quotation.clientNameOrUsername}</span>
        </div>
        {o.isPriority && <span className="text-yellow-600 text-xs shrink-0">⭐ Prioritaria</span>}
      </div>
      <div className="flex gap-3 mt-1 text-xs text-[#8E8D8A]">
        <span>{o.stage}</span>
        {o.productionTiming && <span>· {o.productionTiming}</span>}
      </div>
    </button>
  )
}

function QuotationDetail({ q, onBack }: { q: Quotation; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-[#8E8D8A] hover:text-[#333333] flex items-center gap-1 mb-2">
        ← Volver a la lista
      </button>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <User size={14} className="text-[#8E8D8A] shrink-0" />
          <span className="font-medium text-[#333333]">{q.clientNameOrUsername}</span>
        </div>
        {q.phoneNumber && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-[#8E8D8A] shrink-0" />
            <span className="text-[#333333]">{q.phoneNumber}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-[#8E8D8A] shrink-0" />
          <span className="text-[#333333]">{q.salesChannel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#8E8D8A] shrink-0" />
          <span className="text-[#333333]">Vence: {formatDate(q.validUntil)}</span>
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
        <div className="flex justify-between border-t border-[#D8D3CC] pt-2 mt-1">
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
                <span className="font-medium text-[#333333]">{formatPrice(s.stoneSubtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {q.notes && (
        <div className="text-sm text-[#8E8D8A] italic border-l-2 border-[#D8D3CC] pl-3">{q.notes}</div>
      )}

      <a
        href={`/cotizaciones/${q.id}`}
        className="block w-full text-center bg-[#333333] hover:bg-black text-white text-sm py-2.5 rounded-md font-medium transition-colors uppercase tracking-wider mt-2"
      >
        Ver cotización completa →
      </a>
    </div>
  )
}

function OrderDetail({ o, onBack }: { o: Order; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-[#8E8D8A] hover:text-[#333333] flex items-center gap-1 mb-2">
        ← Volver a la lista
      </button>
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
      <QuotationDetail q={o.quotation} onBack={onBack} />
    </div>
  )
}

type DetailItem =
  | { type: 'quotation'; data: Quotation }
  | { type: 'order'; data: Order }
  | null

const CARD_CONFIG = {
  priority: {
    icon: Star,
    title: 'Órdenes Prioritarias',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
    emptyText: 'No hay órdenes prioritarias.',
    emptyColor: 'text-yellow-700/70',
    numColor: 'text-yellow-700',
  },
  expiring: {
    icon: Clock,
    title: 'Cotizaciones por Expirar',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    emptyText: 'No hay cotizaciones próximas a expirar.',
    emptyColor: 'text-amber-700/70',
    numColor: 'text-amber-700',
  },
  stones: {
    icon: FileWarning,
    title: 'Piedras por Devolver',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900',
    emptyText: 'Todo en orden.',
    emptyColor: 'text-purple-700/70',
    numColor: 'text-purple-700',
  },
  followup: {
    icon: CheckCircle2,
    title: 'Seguimientos Post-Venta',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    emptyText: 'No hay seguimientos pendientes.',
    emptyColor: 'text-blue-700/70',
    numColor: 'text-blue-700',
  },
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
  const [openCard, setOpenCard] = useState<CardType>(null)
  const [detail, setDetail] = useState<DetailItem>(null)

  const closeModal = () => {
    setOpenCard(null)
    setDetail(null)
  }

  const cfg = openCard ? CARD_CONFIG[openCard] : null

  const getModalTitle = () => {
    if (!openCard || !cfg) return ""
    if (detail) {
      if (detail.type === 'quotation') return detail.data.folio || detail.data.id
      return detail.data.quotation.folio || detail.data.id
    }
    return cfg.title
  }

  const getCount = (type: CardType) => {
    if (type === 'priority') return priorityOrders.length
    if (type === 'expiring') return expiringQuotations.length
    if (type === 'stones') return stonesToReturn.length
    if (type === 'followup') return pendingFollowUps.length
    return 0
  }

  return (
    <>
      {/* Modal */}
      {openCard && cfg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#D8D3CC] shrink-0">
              <h3 className="font-semibold text-[#333333] text-base">{getModalTitle()}</h3>
              <button onClick={closeModal} className="text-[#8E8D8A] hover:text-[#333333] transition-colors ml-4">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 flex-1">
              {detail ? (
                detail.type === 'quotation'
                  ? <QuotationDetail q={detail.data} onBack={() => setDetail(null)} />
                  : <OrderDetail o={detail.data} onBack={() => setDetail(null)} />
              ) : (
                <div className="space-y-2">
                  {openCard === 'priority' && (
                    priorityOrders.length === 0
                      ? <p className="text-sm text-[#8E8D8A]">No hay órdenes prioritarias.</p>
                      : priorityOrders.map(o => (
                          <OrderRow key={o.id} o={o} onClick={() => setDetail({ type: 'order', data: o })} />
                        ))
                  )}
                  {openCard === 'expiring' && (
                    expiringQuotations.length === 0
                      ? <p className="text-sm text-[#8E8D8A]">No hay cotizaciones por expirar.</p>
                      : expiringQuotations.map(q => (
                          <QuotationRow key={q.id} q={q} onClick={() => setDetail({ type: 'quotation', data: q })} />
                        ))
                  )}
                  {openCard === 'stones' && (
                    stonesToReturn.length === 0
                      ? <p className="text-sm text-[#8E8D8A]">Todo en orden.</p>
                      : stonesToReturn.map(q => (
                          <QuotationRow key={q.id} q={q} onClick={() => setDetail({ type: 'quotation', data: q })} />
                        ))
                  )}
                  {openCard === 'followup' && (
                    pendingFollowUps.length === 0
                      ? <p className="text-sm text-[#8E8D8A]">No hay seguimientos.</p>
                      : pendingFollowUps.map(o => (
                          <OrderRow key={o.id} o={o} onClick={() => setDetail({ type: 'order', data: o })} />
                        ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cards — solo muestran número */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {(['priority', 'expiring', 'stones', 'followup'] as CardType[]).map(type => {
          const c = CARD_CONFIG[type!]
          const Icon = c.icon
          const count = getCount(type)
          return (
            <button
              key={type}
              onClick={() => { setOpenCard(type); setDetail(null) }}
              className={`${c.bg} border ${c.border} rounded-xl p-5 shadow-sm text-left hover:shadow-md transition-all group`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={c.iconColor} size={18} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${c.titleColor}`}>{c.title}</span>
              </div>
              {count === 0 ? (
                <p className={`text-sm ${c.emptyColor}`}>{c.emptyText}</p>
              ) : (
                <div className="flex items-end gap-2">
                  <span className={`text-5xl font-serif ${c.numColor} group-hover:scale-105 transition-transform`}>
                    {count}
                  </span>
                  <span className={`text-sm mb-1 ${c.emptyColor}`}>
                    {count === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
