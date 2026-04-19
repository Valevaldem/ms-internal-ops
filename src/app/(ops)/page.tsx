import prisma from "@/lib/prisma";
import { AlertCircle, Clock, FileWarning, CheckCircle2, Star } from "lucide-react";
import Link from "next/link";
import DashboardDateFilter from "./_components/DashboardDateFilter";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import AlertCards from "./_components/AlertCards";

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

  const expiringQuotations = await prisma.quotation.findMany({
    where: {
      ...advisorQuotationFilter,
      status: { notIn: ["Convertida", "Declinada"] },
      validUntil: {
        gte: now,
        lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      }
    },
    include: { stones: true, salesAssociate: true },
    orderBy: { validUntil: 'asc' }
  });

  const overdueOrders = await prisma.order.findMany({
    where: {
      ...advisorOrderFilter,
      stage: { in: ["Producción"] },
      estimatedProductionEnd: { lt: now }
    },
    include: { quotation: { include: { stones: true, salesAssociate: true } } }
  });

  const pendingFollowUps = await prisma.order.findMany({
    where: {
      ...advisorOrderFilter,
      OR: [
        { stage: "Post-Sale Follow-Up Pending (5 days)", postSale5DaysDate: { lte: now } },
        { stage: "Post-Sale Follow-Up Pending (1 month)", postSale1MonthDate: { lte: now } }
      ]
    },
    include: { quotation: { include: { stones: true, salesAssociate: true } } }
  });

  const stonesToReturn = await prisma.quotation.findMany({
    where: {
      ...advisorQuotationFilter,
      validUntil: { lt: now },
      status: { not: "Declinada" },
      order: { is: null }
    },
    include: { stones: true, salesAssociate: true },
    orderBy: { validUntil: 'asc' }
  });

  const priorityOrders = await prisma.order.findMany({
    where: {
      ...advisorOrderFilter,
      isPriority: true,
      stage: { notIn: ["Entregado", "Cycle Closed"] }
    },
    include: { quotation: { include: { stones: true, salesAssociate: true } } },
    orderBy: { createdAt: 'asc' }
  });

  // Metrics
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
      where: { ...advisorQuotationFilter, quotationDate: { gte: startDate, lte: endDate } },
      include: { order: true, salesAssociate: true }
    }),
    isComparing && prevStartDate && prevEndDate
      ? prisma.quotation.findMany({
          where: { ...advisorQuotationFilter, quotationDate: { gte: prevStartDate, lte: prevEndDate } },
          include: { order: true }
        })
      : Promise.resolve([])
  ]);

  type QuotationWithOrder = { status: string; order: any | null; };

  const getMetrics = (qs: QuotationWithOrder[]) => {
    let convertida = 0, pendiente = 0, enSeguimiento = 0, oportunidad = 0, declinada = 0;
    for (const q of qs) {
      if (q.order) convertida++;
      else if (q.status === "En seguimiento") enSeguimiento++;
      else if (q.status === "Oportunidad de cierre") oportunidad++;
      else if (q.status === "Declinada") declinada++;
      else pendiente++;
    }
    return { total: qs.length, convertida, pendiente, enSeguimiento, oportunidad, declinada };
  };

  const currentMetrics = getMetrics(filteredQuotations);
  const prevMetrics = getMetrics(prevFilteredQuotations);

  type AdvisorMetrics = { name: string; total: number; convertida: number; pendiente: number; enSeguimiento: number; oportunidad: number; declinada: number; };
  const advisorBreakdown = new Map<string, AdvisorMetrics>();

  for (const q of filteredQuotations) {
    let categorizedStatus: keyof Omit<AdvisorMetrics, 'name' | 'total'> = 'pendiente';
    if (q.order) categorizedStatus = 'convertida';
    else if (q.status === "En seguimiento") categorizedStatus = 'enSeguimiento';
    else if (q.status === "Oportunidad de cierre") categorizedStatus = 'oportunidad';
    else if (q.status === "Declinada") categorizedStatus = 'declinada';

    const advisorName = q.salesAssociate?.name || "Desconocido";
    if (!advisorBreakdown.has(advisorName)) {
      advisorBreakdown.set(advisorName, { name: advisorName, total: 0, convertida: 0, pendiente: 0, enSeguimiento: 0, oportunidad: 0, declinada: 0 });
    }
    const advisor = advisorBreakdown.get(advisorName)!;
    advisor.total++;
    advisor[categorizedStatus]++;
  }

  const formatPercent = (count: number, total: number) => total === 0 ? "0%" : `${((count / total) * 100).toFixed(1)}%`;

  const getChangeIndicator = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return null;
    return (
      <span className={`text-xs ml-2 font-medium ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
        {diff > 0 ? `+${diff}` : `${diff}`}
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

      {/* Alertas pendientes — arriba de todo para visibilidad inmediata */}
      <section>
        <h3 className="text-sm font-semibold text-[#8E8D8A] uppercase tracking-wider mb-3">Alertas pendientes</h3>
        <AlertCards
          priorityOrders={JSON.parse(JSON.stringify(priorityOrders))}
          expiringQuotations={JSON.parse(JSON.stringify(expiringQuotations))}
          stonesToReturn={JSON.parse(JSON.stringify(stonesToReturn))}
          pendingFollowUps={JSON.parse(JSON.stringify(pendingFollowUps))}
        />
      </section>

      {/* Metrics */}
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
              <Link href={drillDownUrl()} className="hover:text-[#C5B358] hover:underline">{currentMetrics.total}</Link>
              {isComparing && getChangeIndicator(currentMetrics.total, prevMetrics.total)}
            </p>
            <p className="text-xs text-[#8E8D8A] mt-1">total cotizaciones</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[#D8D3CC]">
          {[
            { label: 'Convertidas', key: 'convertida' as const, color: 'text-[#C5B358]' },
            { label: 'Pendiente', key: 'pendiente' as const, color: 'text-[#333333]' },
            { label: 'Seguimiento', key: 'enSeguimiento' as const, color: 'text-[#333333]' },
            { label: 'Oportunidad', key: 'oportunidad' as const, color: 'text-[#333333]' },
            { label: 'Declinada', key: 'declinada' as const, color: 'text-[#333333]' },
          ].map(({ label, key, color }) => (
            <div key={key} className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">{label}</p>
              <div className="flex items-baseline justify-center">
                <Link href={drillDownUrl(key)} className={`text-3xl font-serif ${color} hover:text-[#C5B358] hover:underline`}>
                  {currentMetrics[key]}
                </Link>
                {isComparing && getChangeIndicator(currentMetrics[key], prevMetrics[key])}
              </div>
              <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(currentMetrics[key], currentMetrics.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advisor Breakdown */}
      {sortedAdvisors.length > 0 && user.role === 'manager' && (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-[#F5F2EE] border-b border-[#D8D3CC]">
            <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">Desglose por Asesora</h3>
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
                    <td className="px-6 py-4 font-medium text-[#333333] whitespace-nowrap">{advisor.name}</td>
                    <td className="px-6 py-4 text-center font-semibold"><Link href={drillDownUrl(undefined, advisor.name)} className="hover:text-[#C5B358] hover:underline">{advisor.total}</Link></td>
                    <td className="px-6 py-4 text-center text-[#C5B358] font-medium"><Link href={drillDownUrl('convertida', advisor.name)} className="hover:underline">{advisor.convertida}</Link></td>
                    <td className="px-6 py-4 text-center"><Link href={drillDownUrl('pendiente', advisor.name)} className="hover:text-[#C5B358] hover:underline">{advisor.pendiente}</Link></td>
                    <td className="px-6 py-4 text-center"><Link href={drillDownUrl('enSeguimiento', advisor.name)} className="hover:text-[#C5B358] hover:underline">{advisor.enSeguimiento}</Link></td>
                    <td className="px-6 py-4 text-center"><Link href={drillDownUrl('oportunidad', advisor.name)} className="hover:text-[#C5B358] hover:underline">{advisor.oportunidad}</Link></td>
                    <td className="px-6 py-4 text-center"><Link href={drillDownUrl('declinada', advisor.name)} className="hover:text-[#C5B358] hover:underline">{advisor.declinada}</Link></td>
                    <td className="px-6 py-4 text-right text-[#C5B358] font-medium">{formatPercent(advisor.convertida, advisor.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
