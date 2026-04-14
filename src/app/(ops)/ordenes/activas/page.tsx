import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { translateStage } from "@/lib/translations";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import OrdenesActivasClient from "./_client";

export const dynamic = "force-dynamic";

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

function getNextStage(stage: string): string | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
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
  const view = typeof searchParams.view === 'string' ? searchParams.view : 'mosaic'; // mosaic por defecto

  const whereClause: any = {
    stage: {
      notIn: ["Entregado", "Post-Sale Follow-Up Pending (5 days)", "Post-Sale Follow-Up Pending (1 month)", "Cycle Closed"]
    }
  };

  // ADVISOR FILTER — solo ven sus propias órdenes
  if (user.role === 'advisor' && user.salesAssociateId) {
    whereClause.quotation = {
      salesAssociateId: user.salesAssociateId
    };
  }

  if (filterStage) whereClause.stage = filterStage;
  if (filterDelivery) whereClause.deliveryMethod = filterDelivery;
  if (filterPayment) whereClause.paymentStatus = filterPayment;

  if (filterSalesChannel) {
    whereClause.quotation = {
      ...whereClause.quotation,
      salesChannel: filterSalesChannel
    };
  }

  if (q) {
    whereClause.quotation = {
      ...whereClause.quotation,
      OR: [
        { folio: { contains: q } },
        { clientNameOrUsername: { contains: q } }
      ]
    };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      quotation: {
        include: { salesAssociate: true }
      },
      stageHistory: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  function getRequiredAction(order: any) {
    if (order.stage === "Por confirmar diseño final") return "Confirmar diseño final";
    if (order.stage === "Producción") return "Producción en curso";
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
    const now = new Date().getTime();
    return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }

  let processedOrders = orders.map(order => ({
    ...order,
    requiredAction: getRequiredAction(order),
    daysInStage: getDaysInStage(order),
    nextStage: getNextStage(order.stage),
  }));

  if (filterBlocked === 'blocked') {
    processedOrders = processedOrders.filter(o =>
      o.requiredAction.startsWith('Falta') || o.requiredAction.startsWith('Esperando')
    );
  } else if (filterBlocked === 'unblocked') {
    processedOrders = processedOrders.filter(o =>
      !o.requiredAction.startsWith('Falta') && !o.requiredAction.startsWith('Esperando')
    );
  }

  // SERVER ACTION: avanzar etapa
  async function advanceStage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentStage = formData.get("stage") as string;
    const nextStage = getNextStage(currentStage);
    if (!nextStage) return;

    const isMovingToProduction = currentStage === "Por confirmar diseño final";
    const totalDays = 20; // default

    await prisma.order.update({
      where: { id },
      data: {
        stage: nextStage,
        ...(isMovingToProduction ? {
          productionStartDate: new Date(),
          estimatedProductionEnd: new Date(new Date().getTime() + totalDays * 24 * 60 * 60 * 1000)
        } : {}),
        stageHistory: { create: { stage: nextStage } }
      }
    });

    revalidatePath("/ordenes/activas");
    revalidatePath("/ordenes/produccion");

    if (nextStage === "Entregado") {
      redirect("/ordenes/historial");
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Órdenes Activas</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Vista operativa de órdenes en curso</p>
        </div>
        <div className="text-sm text-[#8E8D8A] font-medium">
          {processedOrders.length} orden{processedOrders.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Filtros */}
      <form method="GET" className="bg-white p-4 border border-[#D8D3CC] rounded-lg shadow-sm flex flex-wrap gap-3 items-end mb-2">
        <input type="hidden" name="view" value={view} />

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Buscar</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Folio o Cliente..."
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

        {(q || filterStage || filterDelivery || filterPayment || filterBlocked || filterSalesChannel) && (
          <div>
            <Link
              href={`/ordenes/activas${view !== 'mosaic' ? `?view=${view}` : ''}`}
              className="text-sm text-[#8E8D8A] hover:text-[#333333] underline px-2 py-2 inline-block h-[38px] leading-[22px]"
            >
              Limpiar
            </Link>
          </div>
        )}
      </form>

      {/* Toggle Vista */}
      <div className="flex gap-2 justify-end mb-2">
        <Link
          href={`/ordenes/activas?${new URLSearchParams({ ...(q && { q }), ...(filterStage && { stage: filterStage }), ...(filterDelivery && { delivery: filterDelivery }), ...(filterPayment && { payment: filterPayment }), ...(filterBlocked && { blocked: filterBlocked }), ...(filterSalesChannel && { salesChannel: filterSalesChannel }), view: 'mosaic' }).toString()}`}
          className={`px-3 py-1.5 text-xs rounded border transition-colors ${view === 'mosaic' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-[#8E8D8A] border-[#D8D3CC] hover:border-[#333333]'}`}
        >
          ⊞ Mosaico
        </Link>
        <Link
          href={`/ordenes/activas?${new URLSearchParams({ ...(q && { q }), ...(filterStage && { stage: filterStage }), ...(filterDelivery && { delivery: filterDelivery }), ...(filterPayment && { payment: filterPayment }), ...(filterBlocked && { blocked: filterBlocked }), ...(filterSalesChannel && { salesChannel: filterSalesChannel }), view: 'list' }).toString()}`}
          className={`px-3 py-1.5 text-xs rounded border transition-colors ${view === 'list' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-[#8E8D8A] border-[#D8D3CC] hover:border-[#333333]'}`}
        >
          ☰ Lista
        </Link>
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

                {/* Botón avanzar etapa (inline) */}
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

                {/* Link detalle */}
                <Link
                  href={`/ordenes/${o.id}`}
                  className="text-xs text-[#8E8D8A] hover:text-[#C5B358] transition-colors text-center"
                >
                  Ver detalle
                </Link>
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
                <th className="px-6 py-4 font-medium text-right">Avanzar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {processedOrders.map(o => {
                const blocked = isBlocked(o);
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
