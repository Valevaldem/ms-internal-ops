import prisma from "@/lib/prisma";
import { AlertCircle, Clock, FileWarning, CheckCircle2, Star } from "lucide-react";
import Link from "next/link";
import DashboardDateFilter from "./_components/DashboardDateFilter";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor']);

  const params = await searchParams;
  const now = new Date();

  const advisorQuotationFilter = user.role === 'advisor' && user.salesAssociateId ? { salesAssociateId: user.salesAssociateId } : {};
  const advisorOrderFilter = user.role === 'advisor' && user.salesAssociateId ? { quotation: { salesAssociateId: user.salesAssociateId } } : {};

  // FIX: Fetch expiring quotations — filtra por status que NO sean convertidas/declinadas
  const expiringQuotations = await prisma.quotation.findMany({
    where: {
      ...advisorQuotationFilter,
      status: { notIn: ["Convertida", "Declinada"] },
      validUntil: {
        gte: now,
        lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { validUntil: 'asc' }
  });

  // Fetch overdue production orders
  const overdueOrders = await prisma.order.findMany({
    where: {
      ...advisorOrderFilter,
      stage: { in: ["Producción"] },
      estimatedProductionEnd: { lt: now }
    },
    include: { quotation: true }
  });

  // FIX: Fetch pending follow-ups — include quotation para que el render no falle
  const pendingFollowUps = await prisma.order.findMany({
    where: {
      ...advisorOrderFilter,
      OR: [
        { stage: "Post-Sale Follow-Up Pending (5 days)", postSale5DaysDate: { lte: now } },
        { stage: "Post-Sale Follow-Up Pending (1 month)", postSale1MonthDate: { lte: now } }
      ]
    },
    include: { quotation: true }
  });

  // FIX: Fetch expired quotations holding stones — usa valores correctos en español y filtra las ya convertidas a orden
  const stonesToReturn = await prisma.quotation.findMany({
    where: {
      ...advisorQuotationFilter,
      validUntil: { lt: now },
      status: { not: "Declinada" },
      order: { is: null }
    },
    orderBy: { validUntil: 'asc' }
  });

  // NEW: Órdenes prioritarias
  const priorityOrders = await prisma.order.findMany({
    where: {
      ...advisorOrderFilter,
      isPriority: true,
      stage: { notIn: ["Entregado", "Cycle Closed"] }
    },
    include: { quotation: true },
    orderBy: { createdAt: 'asc' }
  });

  // Calculate filtered quotation metrics
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDateStr = typeof params.startDate === 'string' ? params.startDate : null;
  const endDateStr = typeof params.endDate === 'string' ? params.endDate : null;

  const startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : defaultStartDate;
  let endDate = endDateStr ? new Date(endDateStr + 'T23:59:59.999') : now;

  const compareStartDateStr = typeof params.compareStartDate === 'string' ? params.compareStartDate : null;
  const compareEndDateStr = typeof params.compareEndDate === 'string' ? params.compareEndDate : null;
  const isComparing = !!(compareStartDateStr && compareEndDateStr);

  let prevStartDate: Date | null = null;
  let prevEndDate: Date | null = null;

  if (isComparing) {
    prevStartDate = new Date(compareStartDateStr + 'T00:00:00');
    prevEndDate = new Date(compareEndDateStr + 'T23:59:59.999');
  }

  const [filteredQuotations, prevFilteredQuotations] = await Promise.all([
    prisma.quotation.findMany({
      where: {
        ...advisorQuotationFilter,
        quotationDate: {
          gte: startDate,
          lte: endDate,
        }
      },
      include: { order: true, salesAssociate: true }
    }),
    isComparing && prevStartDate && prevEndDate
      ? prisma.quotation.findMany({
          where: {
            ...advisorQuotationFilter,
            quotationDate: {
              gte: prevStartDate,
              lte: prevEndDate,
            }
          },
          include: { order: true }
        })
      : Promise.resolve([])
  ]);

  type QuotationWithOrder = {
    status: string;
    order: any | null;
  };

  const getMetrics = (qs: QuotationWithOrder[]) => {
    let convertida = 0, pendiente = 0, enSeguimiento = 0, oportunidad = 0, declinada = 0;

    for (const q of qs) {
      if (q.order) {
        convertida++;
      } else if (q.status === "En seguimiento") {
        enSeguimiento++;
      } else if (q.status === "Oportunidad de cierre") {
        oportunidad++;
      } else if (q.status === "Declinada") {
        declinada++;
      } else {
        pendiente++;
      }
    }

    return {
      total: qs.length,
      convertida,
      pendiente,
      enSeguimiento,
      oportunidad,
      declinada
    };
  };

  const currentMetrics = getMetrics(filteredQuotations);
  const prevMetrics = getMetrics(prevFilteredQuotations);

  type AdvisorMetrics = {
    name: string;
    total: number;
    convertida: number;
    pendiente: number;
    enSeguimiento: number;
    oportunidad: number;
    declinada: number;
  };

  const advisorBreakdown = new Map<string, AdvisorMetrics>();

  for (const q of filteredQuotations) {
    let categorizedStatus: keyof Omit<AdvisorMetrics, 'name' | 'total'> = 'pendiente';
    if (q.order) {
      categorizedStatus = 'convertida';
    } else if (q.status === "En seguimiento") {
      categorizedStatus = 'enSeguimiento';
    } else if (q.status === "Oportunidad de cierre") {
      categorizedStatus = 'oportunidad';
    } else if (q.status === "Declinada") {
      categorizedStatus = 'declinada';
    }

    const advisorName = q.salesAssociate?.name || "Desconocido";
    if (!advisorBreakdown.has(advisorName)) {
      advisorBreakdown.set(advisorName, {
        name: advisorName,
        total: 0,
        convertida: 0,
        pendiente: 0,
        enSeguimiento: 0,
        oportunidad: 0,
        declinada: 0,
      });
    }

    const advisor = advisorBreakdown.get(advisorName)!;
    advisor.total++;
    advisor[categorizedStatus]++;
  }

  const formatPercent = (count: number, total: number) => {
    if (total === 0) return "0%";
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  const getChangeIndicator = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return null;
    const isPositive = diff > 0;
    return (
      <span className={`text-xs ml-2 font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
        {isPositive ? `+${diff}` : `${diff}`}
      </span>
    );
  };

  const sortedAdvisors = Array.from(advisorBreakdown.values()).sort((a, b) => b.total - a.total);

  const drillDownUrl = (status?: string, advisor?: string) => {
    const p = new URLSearchParams();
    if (startDateStr) p.set('startDate', startDateStr);
    if (endDateStr) p.set('endDate', endDateStr);
    if (status) p.set('status', status);
    if (advisor) p.set('advisor', advisor);
    return `/cotizaciones/historial?${p.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#333333]">Resumen</h2>
        <DashboardDateFilter />
      </div>

      {/* Metrics grid */}
      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 bg-[#F5F2EE] border-b border-[#D8D3CC] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">Cotizaciones del Periodo</h3>
            <p className="text-xs text-[#8E8D8A] mt-1">
              {startDate.toLocaleDateString('es-MX')} — {endDate.toLocaleDateString('es-MX')}
              {isComparing && <span className="ml-2 text-[#C5B358]">(comparando)</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-serif text-[#333333]">
              <Link href={drillDownUrl()} className="hover:text-[#C5B358] hover:underline">
                {currentMetrics.total}
              </Link>
              {isComparing && getChangeIndicator(currentMetrics.total, prevMetrics.total)}
            </p>
            <p className="text-xs text-[#8E8D8A] mt-1">total cotizaciones</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[#D8D3CC]">
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Convertidas</p>
            <div className="flex items-baseline justify-center">
              <Link href={drillDownUrl('convertida')} className="text-3xl font-serif text-[#C5B358] hover:underline">
                {currentMetrics.convertida}
              </Link>
              {isComparing && getChangeIndicator(currentMetrics.convertida, prevMetrics.convertida)}
            </div>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(currentMetrics.convertida, currentMetrics.total)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Pendiente</p>
            <div className="flex items-baseline justify-center">
              <Link href={drillDownUrl('pendiente')} className="text-3xl font-serif text-[#333333] hover:text-[#C5B358] hover:underline">
                {currentMetrics.pendiente}
              </Link>
              {isComparing && getChangeIndicator(currentMetrics.pendiente, prevMetrics.pendiente)}
            </div>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(currentMetrics.pendiente, currentMetrics.total)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Seguimiento</p>
            <div className="flex items-baseline justify-center">
              <Link href={drillDownUrl('enSeguimiento')} className="text-3xl font-serif text-[#333333] hover:text-[#C5B358] hover:underline">
                {currentMetrics.enSeguimiento}
              </Link>
              {isComparing && getChangeIndicator(currentMetrics.enSeguimiento, prevMetrics.enSeguimiento)}
            </div>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(currentMetrics.enSeguimiento, currentMetrics.total)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Oportunidad</p>
            <div className="flex items-baseline justify-center">
              <Link href={drillDownUrl('oportunidad')} className="text-3xl font-serif text-[#333333] hover:text-[#C5B358] hover:underline">
                {currentMetrics.oportunidad}
              </Link>
              {isComparing && getChangeIndicator(currentMetrics.oportunidad, prevMetrics.oportunidad)}
            </div>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(currentMetrics.oportunidad, currentMetrics.total)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Declinada</p>
            <div className="flex items-baseline justify-center">
              <Link href={drillDownUrl('declinada')} className="text-3xl font-serif text-[#333333] hover:text-[#C5B358] hover:underline">
                {currentMetrics.declinada}
              </Link>
              {isComparing && getChangeIndicator(currentMetrics.declinada, prevMetrics.declinada)}
            </div>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(currentMetrics.declinada, currentMetrics.total)}</p>
          </div>
        </div>
      </div>

      {/* Advisor Breakdown */}
      {sortedAdvisors.length > 0 && user.role === 'manager' && (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-[#F5F2EE] border-b border-[#D8D3CC]">
            <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">
              Desglose por Asesora
            </h3>
            <p className="text-xs text-[#8E8D8A] mt-1">Cotizaciones creadas en el periodo seleccionado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#8E8D8A] uppercase bg-white border-b border-[#D8D3CC]">
                <tr>
                  <th className="px-6 py-3 font-medium">Asesora</th>
                  <th className="px-6 py-3 font-medium text-center">Total</th>
                  <th className="px-6 py-3 font-medium text-center">Convertidas</th>
                  <th className="px-6 py-3 font-medium text-center">Pendiente</th>
                  <th className="px-6 py-3 font-medium text-center">Seguimiento</th>
                  <th className="px-6 py-3 font-medium text-center">Oportunidad</th>
                  <th className="px-6 py-3 font-medium text-center">Declinada</th>
                  <th className="px-6 py-3 font-medium text-right">% Conversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D3CC]">
                {sortedAdvisors.map((advisor) => (
                  <tr key={advisor.name} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-[#333333] whitespace-nowrap">
                      {advisor.name}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-[#333333]">
                      <Link href={drillDownUrl(undefined, advisor.name)} className="hover:text-[#C5B358] hover:underline">
                        {advisor.total}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center text-[#C5B358] font-medium">
                      <Link href={drillDownUrl('convertida', advisor.name)} className="hover:underline">
                        {advisor.convertida}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center text-[#333333]">
                      <Link href={drillDownUrl('pendiente', advisor.name)} className="hover:text-[#C5B358] hover:underline">
                        {advisor.pendiente}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center text-[#333333]">
                      <Link href={drillDownUrl('enSeguimiento', advisor.name)} className="hover:text-[#C5B358] hover:underline">
                        {advisor.enSeguimiento}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center text-[#333333]">
                      <Link href={drillDownUrl('oportunidad', advisor.name)} className="hover:text-[#C5B358] hover:underline">
                        {advisor.oportunidad}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center text-[#333333]">
                      <Link href={drillDownUrl('declinada', advisor.name)} className="hover:text-[#C5B358] hover:underline">
                        {advisor.declinada}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right text-[#C5B358] font-medium">
                      {formatPercent(advisor.convertida, advisor.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Órdenes Prioritarias — NUEVO */}
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
                  <Link href={`/ordenes/produccion`} className="text-yellow-800 hover:underline font-medium">
                    {o.quotation.folio || o.id}
                  </Link>
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
                  <Link href={`/cotizaciones/historial`} className="text-amber-800 hover:underline font-medium">
                    {q.folio || q.id}
                  </Link>
                  <span className="text-amber-700 ml-2">({q.clientNameOrUsername})</span>
                  <div className="text-amber-600 text-xs mt-1">Vence: {q.validUntil.toLocaleDateString('es-MX')}</div>
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
                  <Link href={`/cotizaciones/historial`} className="text-purple-800 hover:underline font-medium">
                    {q.folio || q.id}
                  </Link>
                  <span className="text-purple-700 ml-2">({q.clientNameOrUsername})</span>
                  <div className="text-purple-600 text-xs mt-1">
                    Vencida: {q.validUntil.toLocaleDateString('es-MX')}
                  </div>
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
                  <Link href={`/ordenes/historial`} className="text-blue-800 hover:underline font-medium">
                    {o.quotation.folio || o.id}
                  </Link>
                  <span className="text-blue-700 ml-2">({o.quotation.clientNameOrUsername})</span>
                  <div className="text-blue-600 text-xs mt-1">{o.stage}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
