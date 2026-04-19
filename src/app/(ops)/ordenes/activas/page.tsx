import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { translateStage } from "@/lib/translations";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

// Sólo para UI: lista plana usada por el filtro de etapa y orden lógico visual
const STAGE_ORDER = [
  "Por confirmar diseño final",
  "Producción",
  "Certificación",
  "Revisión final de asesora",
  "Creación de Guía",
  "Preparando envío",
  "Listo para entrega",
  "En tránsito",
];

// Sugerencia de siguiente etapa tomando en cuenta el método de entrega.
// Retorna null si no hay siguiente (o si está al final del ciclo activo).
function getNextStage(stage: string, deliveryMethod: string | null): string | null {
  switch (stage) {
    case "Por confirmar diseño final": return "Producción";
    case "Producción": return "Certificación";
    case "Certificación":
      return deliveryMethod === "Shipping" ? "Revisión final de asesora" : "Listo para entrega";
    case "Revisión final de asesora":
      return deliveryMethod === "Shipping" ? "Creación de Guía" : null;
    case "Creación de Guía":
      return deliveryMethod === "Shipping" ? "Preparando envío" : null;
    case "Preparando envío":
      return deliveryMethod === "Shipping" ? "En tránsito" : null;
    case "Listo para entrega":
      return deliveryMethod === "Store Pickup" ? "Entregado" : null;
    case "En tránsito": return "Entregado";
    default: return null;
  }
}

function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur < endDay) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default async function OrdenesActivasPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor']);

  const searchParams = await props.searchParams;

  const q = typeof searchParams.q === 'string' ? searchParams.q : '';
  const filterStage = typeof searchParams.stage === 'string' ? searchParams.stage : '';
  const filterDelivery = typeof searchParams.delivery === 'string' ? searchParams.delivery : '';
  const filterPayment = typeof searchParams.payment === 'string' ? searchParams.payment : '';
  const filterBlocked = typeof searchParams.blocked === 'string' ? searchParams.blocked : '';
  const filterSalesChannel = typeof searchParams.salesChannel === 'string' ? searchParams.salesChannel : '';
  const filterPriority = typeof searchParams.priority === 'string' ? searchParams.priority : '';
  const sortBy = typeof searchParams.sort === 'string' ? searchParams.sort : 'recent';
  const view = typeof searchParams.view === 'string' ? searchParams.view : 'mosaic';

  const whereClause: any = {
    stage: {
      notIn: ["Entregado", "Post-Sale Follow-Up Pending (5 days)", "Post-Sale Follow-Up Pending (1 month)", "Cycle Closed"]
    }
  };

  // ADVISOR — solo sus propias órdenes
  if (user.role === 'advisor' && user.salesAssociateId) {
    whereClause.quotation = { salesAssociateId: user.salesAssociateId };
  }

  if (filterStage) whereClause.stage = filterStage;
  if (filterDelivery) whereClause.deliveryMethod = filterDelivery;
  if (filterPayment) whereClause.paymentStatus = filterPayment;
  if (filterPriority === 'true') whereClause.isPriority = true;

  if (filterSalesChannel) {
    whereClause.quotation = { ...(whereClause.quotation || {}), salesChannel: filterSalesChannel };
  }

  if (q) {
    whereClause.quotation = {
      ...(whereClause.quotation || {}),
      OR: [
        { folio: { contains: q } },
        { clientNameOrUsername: { contains: q } }
      ]
    };
  }

  // Orden configurable desde el dropdown "Sort by"
  let orderBy: any = { updatedAt: 'desc' };
  if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sortBy === 'createdDesc') orderBy = { createdAt: 'desc' };
  else if (sortBy === 'production') orderBy = { productionStartDate: 'asc' };
  else if (sortBy === 'client') orderBy = { quotation: { clientNameOrUsername: 'asc' } };

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      quotation: { include: { salesAssociate: true } },
      stageHistory: { orderBy: { createdAt: 'desc' } }
    },
    orderBy
  });

  function getRequiredAction(order: any) {
    if (order.stage === "Por confirmar diseño final") return "Confirmar diseño final";
    if (order.stage === "Producción") {
      if (order.isCertificatePending) return "Esperando datos certificado";
      return "Producción en curso";
    }
    if (order.stage === "Certificación") {
      if (order.isCertificatePending) return "Esperando certificado";
      return "Completar certificación";
    }
    if (order.stage === "Revisión final de asesora") {
      if (order.paymentStatus !== "Liquidado") return "Falta liquidar";
      return "Revisión final";
    }
    if (order.stage === "Creación de Guía") return "Lista para empaque";
    if (order.stage === "Listo para entrega") return "Lista para entregar en tienda";
    if (order.stage === "Preparando envío") return "Lista para enviar";
    if (order.stage === "En tránsito") return "Rastrear entrega";
    return "En proceso";
  }

  function getDaysInStage(order: any) {
    if (!order.stageHistory || order.stageHistory.length === 0) return 0;
    const currentStageHistory = order.stageHistory.find((h: any) => h.stage === order.stage);
    if (!currentStageHistory) return 0;
    const start = new Date(currentStageHistory.createdAt).getTime();
    return Math.max(0, Math.floor((Date.now() - start) / 86400000));
  }

  let processedOrders = orders.map(order => {
    const nextStage = getNextStage(order.stage, order.deliveryMethod);
    let productionProgress: { businessDays: number; totalDays: number; isOverdue: boolean } | null = null;
    if (order.stage === "Producción" && order.productionStartDate) {
      const totalDays = order.productionTiming === "Express" ? 5 : order.productionTiming === "Special" ? 50 : 20;
      const businessDays = countBusinessDays(new Date(order.productionStartDate), new Date());
      productionProgress = { businessDays, totalDays, isOverdue: businessDays > totalDays };
    }
    return {
      ...order,
      requiredAction: getRequiredAction(order),
      daysInStage: getDaysInStage(order),
      nextStage,
      productionProgress,
    };
  });

  if (filterBlocked === 'blocked') {
    processedOrders = processedOrders.filter(o =>
      o.requiredAction.startsWith('Falta') || o.requiredAction.startsWith('Esperando')
    );
  } else if (filterBlocked === 'unblocked') {
    processedOrders = processedOrders.filter(o =>
      !o.requiredAction.startsWith('Falta') && !o.requiredAction.startsWith('Esperando')
    );
  }

  // Alerta global: órdenes en producción con 10+ días hábiles y certificado pendiente
  const certAlerts = processedOrders.filter(o =>
    o.stage === "Producción" &&
    o.isCertificatePending &&
    o.productionProgress &&
    o.productionProgress.businessDays >= 10
  );

  // SERVER ACTION: avanzar etapa con branching correcto
  async function advanceStage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentStage = formData.get("stage") as string;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");

    if ((currentStage === "Producción" || currentStage === "Certificación") && order.isCertificatePending) {
      throw new Error("Certificado pendiente.");
    }

    const nextStage = getNextStage(currentStage, order.deliveryMethod);
    if (!nextStage || nextStage === currentStage) return;

    const isMovingToProduction = nextStage === "Producción";
    const totalDays = order.productionTiming === "Express" ? 5 : order.productionTiming === "Special" ? 50 : 20;

    await prisma.order.update({
      where: { id },
      data: {
        stage: nextStage,
        ...(isMovingToProduction ? {
          productionStartDate: new Date(),
          estimatedProductionEnd: new Date(Date.now() + totalDays * 86400000)
        } : {}),
        stageHistory: { create: { stage: nextStage } }
      }
    });

    revalidatePath("/ordenes/activas");

    if (nextStage === "Entregado") {
      redirect("/ordenes/historial");
    }
  }

  // SERVER ACTION: deshacer último avance de etapa
  async function undoLastAdvance(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { stageHistory: { orderBy: { createdAt: "desc" }, take: 2 } }
    });
    if (!order || order.stageHistory.length < 2) return;
    const [cur, prev] = order.stageHistory;

    await prisma.$transaction([
      prisma.orderStageHistory.delete({ where: { id: cur.id } }),
      prisma.order.update({
        where: { id },
        data: {
          stage: prev.stage,
          ...(cur.stage === "Producción" ? { productionStartDate: null, estimatedProductionEnd: null } : {})
        }
      }),
    ]);

    revalidatePath("/ordenes/activas");
  }

  const isBlocked = (o: any) =>
    o.requiredAction.startsWith('Falta') || o.requiredAction.startsWith('Esperando');

  const stageColor: Record<string, string> = {
    "Por confirmar diseño final": "bg-yellow-50 border-yellow-200 text-yellow-700",
    "Producción": "bg-blue-50 border-blue-200 text-blue-700",
    "Certificación": "bg-purple-50 border-purple-200 text-purple-700",
    "Revisión final de asesora": "bg-orange-50 border-orange-200 text-orange-700",
    "Creación de Guía": "bg-teal-50 border-teal-200 text-teal-700",
    "Preparando envío": "bg-indigo-50 border-indigo-200 text-indigo-700",
    "Listo para entrega": "bg-green-50 border-green-200 text-green-700",
    "En tránsito": "bg-cyan-50 border-cyan-200 text-cyan-700",
  };

  // URL helper que preserva todos los filtros actuales (para toggles de view y sort)
  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = {
      ...(q && { q }),
      ...(filterStage && { stage: filterStage }),
      ...(filterDelivery && { delivery: filterDelivery }),
      ...(filterPayment && { payment: filterPayment }),
      ...(filterBlocked && { blocked: filterBlocked }),
      ...(filterSalesChannel && { salesChannel: filterSalesChannel }),
      ...(filterPriority && { priority: filterPriority }),
      sort: sortBy,
      view,
      ...overrides,
    };
    Object.entries(base).forEach(([k, v]) => v && p.set(k, v));
    return `/ordenes/activas?${p.toString()}`;
  };

  const hasAnyFilter = q || filterStage || filterDelivery || filterPayment || filterBlocked || filterSalesChannel || filterPriority;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Órdenes Activas</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Control total de órdenes en curso — producción, certificación y entrega</p>
        </div>
        <div className="text-sm text-[#8E8D8A] font-medium">
          {processedOrders.length} orden{processedOrders.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Alerta certificados pendientes en producción */}
      {certAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">
              {certAlerts.length === 1 ? "1 orden lleva 10+ días hábiles en producción sin datos de certificado" : `${certAlerts.length} órdenes llevan 10+ días hábiles en producción sin datos de certificado`}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {certAlerts.map((o) => (
                <Link key={o.id} href={`/ordenes/${o.id}`} className="text-xs text-amber-700 underline hover:text-amber-900 font-medium">
                  {o.quotation.folio || o.id.split("-")[0] + ".."}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <form method="GET" className="bg-white p-4 border border-[#D8D3CC] rounded-lg shadow-sm flex flex-wrap gap-3 items-end">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="sort" value={sortBy} />

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Buscar</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Folio o cliente..."
            className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]"
          />
        </div>

        <div className="w-44">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Etapa</label>
          <select name="stage" defaultValue={filterStage} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todas las etapas</option>
            {STAGE_ORDER.map(s => (
              <option key={s} value={s}>{translateStage(s)}</option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Entrega</label>
          <select name="delivery" defaultValue={filterDelivery} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todas</option>
            <option value="Store Pickup">Tienda</option>
            <option value="Shipping">Envío</option>
          </select>
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Pago</label>
          <select name="payment" defaultValue={filterPayment} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todos</option>
            <option value="Parcial">Parcial</option>
            <option value="Liquidado">Liquidado</option>
          </select>
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Estado</label>
          <select name="blocked" defaultValue={filterBlocked} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todos</option>
            <option value="blocked">Bloqueadas</option>
            <option value="unblocked">En curso</option>
          </select>
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Prioridad</label>
          <select name="priority" defaultValue={filterPriority} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todas</option>
            <option value="true">Solo prioritarias</option>
          </select>
        </div>

        {user.role === 'manager' && (
          <div className="w-32">
            <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Canal</label>
            <select name="salesChannel" defaultValue={filterSalesChannel} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
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

        <div>
          <button type="submit" className="bg-[#333333] text-white px-4 py-2 rounded text-sm hover:bg-[#1A1A1A] transition-colors h-[38px]">
            Filtrar
          </button>
        </div>

        {hasAnyFilter && (
          <div>
            <Link
              href={`/ordenes/activas?view=${view}&sort=${sortBy}`}
              className="text-sm text-[#8E8D8A] hover:text-[#333333] underline px-2 py-2 inline-block h-[38px] leading-[22px]"
            >
              Limpiar
            </Link>
          </div>
        )}
      </form>

      {/* Toggle vista + Sort */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#8E8D8A]">Ordenar por</label>
          <form method="GET" className="inline-flex">
            {q && <input type="hidden" name="q" value={q} />}
            {filterStage && <input type="hidden" name="stage" value={filterStage} />}
            {filterDelivery && <input type="hidden" name="delivery" value={filterDelivery} />}
            {filterPayment && <input type="hidden" name="payment" value={filterPayment} />}
            {filterBlocked && <input type="hidden" name="blocked" value={filterBlocked} />}
            {filterSalesChannel && <input type="hidden" name="salesChannel" value={filterSalesChannel} />}
            {filterPriority && <input type="hidden" name="priority" value={filterPriority} />}
            <input type="hidden" name="view" value={view} />
            <select
              name="sort"
              defaultValue={sortBy}
              onChange={(e) => e.currentTarget.form?.submit()}
              className="text-xs border border-[#D8D3CC] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#C5B358]"
            >
              <option value="recent">Actualización reciente</option>
              <option value="oldest">Más antiguas</option>
              <option value="createdDesc">Creación reciente</option>
              <option value="production">Inicio de producción</option>
              <option value="client">Cliente (A–Z)</option>
            </select>
          </form>
        </div>
        <div className="flex gap-2">
          <Link
            href={buildUrl({ view: 'mosaic' })}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${view === 'mosaic' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-[#8E8D8A] border-[#D8D3CC] hover:border-[#333333]'}`}
          >
            ⊞ Mosaico
          </Link>
          <Link
            href={buildUrl({ view: 'list' })}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${view === 'list' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-[#8E8D8A] border-[#D8D3CC] hover:border-[#333333]'}`}
          >
            ☰ Lista
          </Link>
        </div>
      </div>

      {processedOrders.length === 0 && (
        <div className="bg-white border border-[#D8D3CC] rounded-lg p-12 text-center text-[#8E8D8A]">
          No hay órdenes activas con los filtros aplicados.
        </div>
      )}

      {/* VISTA MOSAICO */}
      {view === 'mosaic' && processedOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {processedOrders.map(o => {
            const blocked = isBlocked(o);
            const stageCls = stageColor[o.stage] || "bg-[#F5F2EE] border-[#D8D3CC] text-[#8E8D8A]";
            const canUndo = o.stageHistory && o.stageHistory.length >= 2;
            return (
              <div
                key={o.id}
                className={`bg-white border rounded-lg shadow-sm p-4 flex flex-col gap-3 ${o.isPriority ? 'border-red-300' : 'border-[#D8D3CC]'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/ordenes/${o.id}`}
                      className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors text-sm"
                    >
                      {o.quotation.folio || o.id.split('-')[0] + '..'}
                    </Link>
                    {o.isPriority && (
                      <span className="ml-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        ★ Prioritaria
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stageCls}`}>
                    {translateStage(o.stage)}
                  </span>
                </div>

                {/* Cliente / Asesora */}
                <div>
                  <p className="text-sm font-medium text-[#333333] leading-tight">{o.quotation.clientNameOrUsername}</p>
                  {user.role === 'manager' && (
                    <p className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</p>
                  )}
                </div>

                {/* Progreso producción */}
                {o.productionProgress && (
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-[#F5F2EE] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${o.productionProgress.isOverdue ? "bg-red-500" : "bg-[#C5B358]"}`}
                        style={{ width: `${Math.min(100, (o.productionProgress.businessDays / o.productionProgress.totalDays) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wider ${o.productionProgress.isOverdue ? "text-red-500" : "text-[#8E8D8A]"}`}>
                      {o.productionProgress.businessDays}/{o.productionProgress.totalDays} días hábiles
                    </span>
                  </div>
                )}

                {/* Días + Pago */}
                <div className="flex items-center gap-3 text-xs text-[#8E8D8A]">
                  <span className={`${o.daysInStage >= 5 ? 'text-red-500 font-medium' : ''}`}>
                    {o.daysInStage}d en esta etapa
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${o.paymentStatus === 'Liquidado' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {o.paymentStatus}
                  </span>
                </div>

                {/* Acción requerida */}
                <div className={`text-xs px-2 py-1 rounded border ${blocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#F5F2EE] border-[#D8D3CC] text-[#555555]'}`}>
                  {blocked ? '⚠ ' : ''}{o.requiredAction}
                </div>

                {/* Botón avanzar etapa (inline) + Undo */}
                <div className="flex flex-col gap-1.5 mt-auto">
                  {!blocked && o.nextStage && (
                    <form action={advanceStage}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="stage" value={o.stage} />
                      <button
                        type="submit"
                        className="w-full text-center text-xs bg-[#C5B358] hover:bg-[#b0a04f] text-white px-3 py-1.5 rounded font-medium transition-colors"
                      >
                        Avanzar etapa →
                      </button>
                    </form>
                  )}
                  {canUndo && (
                    <form action={undoLastAdvance}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="w-full text-center text-[10px] text-[#8E8D8A] hover:text-red-500 font-medium transition-colors"
                      >
                        ↺ Deshacer último avance
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="text-xs text-[#8E8D8A] hover:text-[#C5B358] transition-colors text-center"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA LISTA */}
      {view === 'list' && processedOrders.length > 0 && (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Folio</th>
                <th className="px-6 py-4 font-medium">Cliente / Asesora</th>
                <th className="px-6 py-4 font-medium">Etapa actual</th>
                <th className="px-6 py-4 font-medium">Acción requerida</th>
                <th className="px-6 py-4 font-medium text-center">Días en etapa</th>
                <th className="px-6 py-4 font-medium text-center">Pago</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {processedOrders.map(o => {
                const blocked = isBlocked(o);
                const canUndo = o.stageHistory && o.stageHistory.length >= 2;
                return (
                  <tr key={o.id} className={`hover:bg-[#F5F2EE]/50 transition-colors ${o.isPriority ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex items-center gap-2">
                        {o.quotation.folio || o.id.split('-')[0] + '..'}
                        {o.isPriority && <span title="Prioritaria" className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div>
                      {user.role === 'manager' && (
                        <div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">
                        {translateStage(o.stage)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded border ${blocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#F5F2EE] border-[#D8D3CC] text-[#555555]'}`}>
                        {blocked ? '⚠ ' : ''}{o.requiredAction}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-semibold ${o.daysInStage >= 5 ? 'text-red-600' : 'text-[#333333]'}`}>
                        {o.daysInStage}d
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${o.paymentStatus === 'Liquidado' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {!blocked && o.nextStage ? (
                          <form action={advanceStage} className="inline-block">
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="stage" value={o.stage} />
                            <button type="submit" className="text-xs bg-[#C5B358] hover:bg-[#b0a04f] text-white px-3 py-1.5 rounded font-medium transition-colors whitespace-nowrap">
                              Avanzar etapa →
                            </button>
                          </form>
                        ) : (
                          <Link href={`/ordenes/${o.id}`} className="text-xs text-[#8E8D8A] hover:text-[#C5B358] transition-colors">
                            Ver →
                          </Link>
                        )}
                        {canUndo && (
                          <form action={undoLastAdvance} className="inline-block">
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="text-[10px] text-[#8E8D8A] hover:text-red-500 font-medium transition-colors whitespace-nowrap">
                              ↺ Deshacer
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
