import prisma from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { translateStage } from "@/lib/translations";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
  if (order.stage === "Revisión final de asesora") return "Revisión final";
  if (order.stage === "Creación de Guía") return "Crear guía de envío";
  if (order.stage === "Listo para entrega") return "Lista para entregar";
  if (order.stage === "Preparando envío") return "Preparar envío";
  if (order.stage === "En tránsito") return "Rastrear entrega";
  return "En proceso";
}

function getDaysInStage(order: any) {
  if (!order.stageHistory || order.stageHistory.length === 0) return 0;
  const entry = order.stageHistory.find((h: any) => h.stage === order.stage);
  if (!entry) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 86400000));
}

export default async function ProduccionPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "advisor"]);

  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const filterStage = typeof sp.stage === "string" ? sp.stage : "";
  const filterDelivery = typeof sp.delivery === "string" ? sp.delivery : "";
  const filterPayment = typeof sp.payment === "string" ? sp.payment : "";
  const filterBlocked = typeof sp.blocked === "string" ? sp.blocked : "";
  const filterPriority = typeof sp.priority === "string" ? sp.priority : "";

  const excludedStages = ["Entregado","Post-Sale Follow-Up Pending (5 days)","Post-Sale Follow-Up Pending (1 month)","Cycle Closed"];
  const advisorFilter = user.role === "advisor" ? { salesAssociateId: user.id } : undefined;

  const productionRaw = await prisma.order.findMany({
    where: {
      stage: "Producción",
      ...(advisorFilter ? { quotation: advisorFilter } : {}),
    },
    include: {
      quotation: { include: { salesAssociate: true } },
      stageHistory: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { productionStartDate: "asc" },
  });

  const activeWhere: any = {
    stage: { notIn: excludedStages },
    ...(advisorFilter ? { quotation: advisorFilter } : {}),
  };
  if (filterStage) activeWhere.stage = filterStage;
  if (filterDelivery) activeWhere.deliveryMethod = filterDelivery;
  if (filterPayment) activeWhere.paymentStatus = filterPayment;
  if (filterPriority === "true") activeWhere.isPriority = true;
  if (q) {
    activeWhere.quotation = {
      ...(activeWhere.quotation || {}),
      OR: [{ folio: { contains: q } }, { clientNameOrUsername: { contains: q } }],
    };
  }

  const activeRaw = await prisma.order.findMany({
    where: activeWhere,
    include: {
      quotation: { include: { salesAssociate: true } },
      stageHistory: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const productionOrders = productionRaw.map((o) => {
    const start = o.productionStartDate ? new Date(o.productionStartDate) : null;
    const businessDays = start ? countBusinessDays(start, new Date()) : 0;
    const totalDays = o.productionTiming === "Express" ? 5 : o.productionTiming === "Special" ? 50 : 20;
    return { ...o, businessDays, totalDays, isOverdue: businessDays > totalDays, needsCertAlert: businessDays >= 10 && o.isCertificatePending };
  });

  let activeOrders = activeRaw.map((o) => ({ ...o, requiredAction: getRequiredAction(o), daysInStage: getDaysInStage(o) }));
  if (filterBlocked === "blocked") activeOrders = activeOrders.filter((o) => o.requiredAction.startsWith("Falta") || o.requiredAction.startsWith("Esperando"));
  else if (filterBlocked === "unblocked") activeOrders = activeOrders.filter((o) => !o.requiredAction.startsWith("Falta") && !o.requiredAction.startsWith("Esperando"));

  const certAlerts = productionOrders.filter((o) => o.needsCertAlert);
  const hasFilters = q || filterStage || filterDelivery || filterPayment || filterBlocked || filterPriority;

  async function advanceStage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const stage = formData.get("stage") as string;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");
    if ((stage === "Producción" || stage === "Certificación") && order.isCertificatePending) throw new Error("Certificado pendiente.");
    let next = stage;
    if (stage === "Por confirmar diseño final") next = "Producción";
    else if (stage === "Producción") next = "Certificación";
    else if (stage === "Certificación") next = order.deliveryMethod === "Shipping" ? "Revisión final de asesora" : "Listo para entrega";
    else if (stage === "Revisión final de asesora" && order.deliveryMethod === "Shipping") next = "Creación de Guía";
    else if (stage === "Creación de Guía" && order.deliveryMethod === "Shipping") next = "Preparando envío";
    else if (stage === "Preparando envío" && order.deliveryMethod === "Shipping") next = "En tránsito";
    else if (stage === "Listo para entrega" && order.deliveryMethod === "Store Pickup") next = "Entregado";
    else if (stage === "En tránsito") next = "Entregado";
    if (next === stage) return;
    const toProduction = next === "Producción";
    const totalDays = order.productionTiming === "Express" ? 5 : order.productionTiming === "Special" ? 50 : 20;
    await prisma.order.update({
      where: { id },
      data: {
        stage: next,
        ...(toProduction ? { productionStartDate: new Date(), estimatedProductionEnd: new Date(Date.now() + totalDays * 86400000) } : {}),
        stageHistory: { create: { stage: next } },
      },
    });
    revalidatePath("/ordenes/produccion");
    if (next === "Entregado") redirect("/ordenes/historial");
  }

  async function undoLastAdvance(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const order = await prisma.order.findUnique({ where: { id }, include: { stageHistory: { orderBy: { createdAt: "desc" }, take: 2 } } });
    if (!order || order.stageHistory.length < 2) return;
    const [cur, prev] = order.stageHistory;
    await prisma.$transaction([
      prisma.orderStageHistory.delete({ where: { id: cur.id } }),
      prisma.order.update({ where: { id }, data: { stage: prev.stage, ...(cur.stage === "Producción" ? { productionStartDate: null, estimatedProductionEnd: null } : {}) } }),
    ]);
    revalidatePath("/ordenes/produccion");
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-serif text-[#333333]">Órdenes</h2>
        <p className="text-sm text-[#8E8D8A] mt-1">Control de producción y seguimiento de todas las órdenes activas</p>
      </div>

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

      <section>
        <h3 className="text-sm font-semibold text-[#8E8D8A] uppercase tracking-wider mb-3 flex items-center gap-2">
          En Producción
          <span className="text-xs bg-[#F5F2EE] border border-[#D8D3CC] text-[#8E8D8A] px-2 py-0.5 rounded-full font-normal">{productionOrders.length}</span>
        </h3>
        {productionOrders.length === 0 ? (
          <div className="bg-white border border-[#D8D3CC] rounded-lg px-6 py-10 text-center text-sm text-[#8E8D8A]">No hay órdenes en producción actualmente.</div>
        ) : (
          <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Orden</th>
                  <th className="px-6 py-4 font-medium">Cliente / Asesora</th>
                  <th className="px-6 py-4 font-medium">Pieza</th>
                  <th className="px-6 py-4 font-medium text-center">Progreso hábil</th>
                  <th className="px-6 py-4 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F2EE]">
                {productionOrders.map((o) => (
                  <tr key={o.id} className={`hover:bg-[#F5F2EE]/50 transition-colors ${o.isPriority ? "bg-red-50/50" : ""}`}>
                    <td className="px-6 py-4">
                      <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex items-center gap-2">
                        {o.quotation.folio || o.quotation.id.split("-")[0] + ".."}
                        {o.isPriority && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Prioritaria" />}
                        {o.needsCertAlert && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">Llenar certificado</span>}
                      </Link>
                      <div className="text-[10px] text-[#8E8D8A] uppercase tracking-wider mt-1">ID: {o.id.split("-")[0]}..</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div>
                      <div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#333333]">{o.quotation.type === "Manual" ? o.quotation.pieceType : o.quotation.modelName}</div>
                      <div className="text-xs text-[#8E8D8A]">{o.deliveryMethod === "Store Pickup" ? "Recoger Tienda" : "Envío"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-32 bg-[#F5F2EE] rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${o.isOverdue ? "bg-red-500" : "bg-[#C5B358]"}`} style={{ width: `${Math.min(100, (o.businessDays / o.totalDays) * 100)}%` }} />
                        </div>
                        <span className={`text-[10px] font-semibold tracking-wider ${o.isOverdue ? "text-red-500" : "text-[#8E8D8A]"}`}>{o.businessDays}/{o.totalDays} días hábiles</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {o.isCertificatePending ? (
                        <span className="text-[10px] text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">Bloqueado: Certificado Pendiente</span>
                      ) : (
                        <div className="flex flex-col items-end gap-2">
                          <form action={advanceStage} className="inline-block">
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="stage" value={o.stage} />
                            <button type="submit" className="text-xs bg-[#F5F2EE] text-[#333333] hover:bg-[#EAE5DF] px-3 py-1.5 rounded font-medium transition-colors">Avanzar etapa →</button>
                          </form>
                          <form action={undoLastAdvance} className="inline-block">
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="text-[10px] text-[#8E8D8A] hover:text-red-500 font-medium transition-colors border-b border-transparent hover:border-red-500">Deshacer último avance</button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[#8E8D8A] uppercase tracking-wider mb-3 flex items-center gap-2">
          Todas las órdenes activas
          <span className="text-xs bg-[#F5F2EE] border border-[#D8D3CC] text-[#8E8D8A] px-2 py-0.5 rounded-full font-normal">{activeOrders.length}</span>
        </h3>
        <form method="GET" className="bg-white p-4 border border-[#D8D3CC] rounded-lg shadow-sm flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Buscar</label>
            <input type="text" name="q" defaultValue={q} placeholder="Folio o cliente..." className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]" />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Etapa</label>
            <select name="stage" defaultValue={filterStage} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
              <option value="">Todas</option>
              <option value="Por confirmar diseño final">Por confirmar diseño</option>
              <option value="Producción">Producción</option>
              <option value="Certificación">Certificación</option>
              <option value="Revisión final de asesora">Revisión final</option>
              <option value="Creación de Guía">Creación de Guía</option>
              <option value="Preparando envío">Preparando envío</option>
              <option value="Listo para entrega">Listo para entrega</option>
              <option value="En tránsito">En tránsito</option>
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Entrega</label>
            <select name="delivery" defaultValue={filterDelivery} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
              <option value="">Todas</option>
              <option value="Store Pickup">Tienda</option>
              <option value="Shipping">Envío</option>
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Pago</label>
            <select name="payment" defaultValue={filterPayment} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
              <option value="">Todos</option>
              <option value="Liquidado">Liquidado</option>
              <option value="Parcial">Parcial</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-[#8E8D8A] mb-1">Prioridad</label>
            <select name="priority" defaultValue={filterPriority} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
              <option value="">Todas</option>
              <option value="true">Solo prioritarias</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#333333] text-white px-4 py-2 rounded text-sm hover:bg-[#1A1A1A] transition-colors">Filtrar</button>
            {hasFilters && <Link href="/ordenes/produccion" className="text-sm text-[#8E8D8A] hover:text-[#333333] underline px-2 py-2 inline-block">Limpiar</Link>}
          </div>
        </form>
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Folio</th>
                <th className="px-6 py-4 font-medium">Cliente / Asesora</th>
                <th className="px-6 py-4 font-medium">Etapa actual</th>
                <th className="px-6 py-4 font-medium">Acción requerida</th>
                <th className="px-6 py-4 font-medium text-center">Días en etapa</th>
                <th className="px-6 py-4 font-medium text-center">Entrega</th>
                <th className="px-6 py-4 font-medium text-center">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {activeOrders.map((o) => (
                <tr key={o.id} className={`hover:bg-[#F5F2EE]/50 transition-colors ${o.isPriority ? "bg-red-50/50" : ""}`}>
                  <td className="px-6 py-4">
                    <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex items-center gap-2">
                      {o.quotation.folio || o.quotation.id.split("-")[0] + ".."}
                      {o.isPriority && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Prioritaria" />}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div>
                    <div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">{translateStage(o.stage)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${o.requiredAction.startsWith("Falta") || o.requiredAction.startsWith("Esperando") ? "text-red-600 bg-red-50 border-red-200" : "text-blue-600 bg-blue-50 border-blue-200"}`}>{o.requiredAction}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-medium ${o.daysInStage > 5 ? "text-red-500" : "text-[#333333]"}`}>{o.daysInStage}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-[#333333]">{o.deliveryMethod === "Store Pickup" ? "Tienda" : "Envío"}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded border ${o.paymentStatus === "Liquidado" ? "text-green-600 bg-green-50 border-green-200" : "text-yellow-600 bg-yellow-50 border-yellow-200"}`}>{o.paymentStatus}</span>
                  </td>
                </tr>
              ))}
              {activeOrders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[#8E8D8A]">No hay órdenes activas con los filtros seleccionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
