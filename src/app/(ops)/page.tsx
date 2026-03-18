import prisma from "@/lib/prisma";
import { AlertCircle, Clock, FileWarning, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import DashboardDateFilter from "./_components/DashboardDateFilter";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // Fetch expiring quotations (less than 3 days remaining)
  const expiringQuotations = await prisma.quotation.findMany({
    where: {
      status: { in: ["Sent", "Waiting for Response", "In Follow-Up", "Extended"] },
      validUntil: { lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { validUntil: 'asc' }
  });

  // Fetch overdue production orders
  const overdueOrders = await prisma.order.findMany({
    where: {
      stage: { in: ["Producción"] },
      estimatedProductionEnd: { lt: now }
    },
    include: { quotation: true }
  });

  // Fetch pending follow-ups (5 days or 1 month)
  const pendingFollowUps = await prisma.order.findMany({
    where: {
      OR: [
        { stage: "Post-Sale Follow-Up Pending (5 days)", postSale5DaysDate: { lte: now } },
        { stage: "Post-Sale Follow-Up Pending (1 month)", postSale1MonthDate: { lte: now } }
      ]
    },
    include: { quotation: true }
  });

  // Fetch expired quotations holding stones (day 15/16 alert)
  const stonesToReturn = await prisma.quotation.findMany({
    where: {
      validUntil: { lt: now },
      status: { notIn: ["Converted", "Archived", "Deleted", "Cancelled"] }
    },
    orderBy: { validUntil: 'asc' }
  });

  // Calculate filtered quotation metrics
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDateStr = typeof params.startDate === 'string' ? params.startDate : null;
  const endDateStr = typeof params.endDate === 'string' ? params.endDate : null;

  const startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : defaultStartDate;
  let endDate = endDateStr ? new Date(endDateStr + 'T23:59:59.999') : now;

  const filteredQuotations = await prisma.quotation.findMany({
    where: {
      quotationDate: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: { order: true }
  });

  const totalQuotations = filteredQuotations.length;

  let convertida = 0;
  let pendiente = 0;
  let enSeguimiento = 0;
  let oportunidad = 0;
  let declinada = 0;

  for (const q of filteredQuotations) {
    if (q.order) {
      convertida++;
    } else if (q.status === "Pendiente de respuesta") {
      pendiente++;
    } else if (q.status === "En seguimiento") {
      enSeguimiento++;
    } else if (q.status === "Oportunidad de cierre") {
      oportunidad++;
    } else if (q.status === "Declinada") {
      declinada++;
    }
  }

  const formatPercent = (count: number, total: number) => {
    if (total === 0) return "0%";
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Resumen Operativo</h2>
          <p className="text-[#8E8D8A] mt-1">Métricas de cotización y alertas internas</p>
        </div>
        <DashboardDateFilter />
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 bg-[#F5F2EE] border-b border-[#D8D3CC]">
          <h3 className="text-sm font-semibold text-[#333333] uppercase tracking-wider">
            Resumen de Cotizaciones ({startDate.toLocaleDateString('es-MX')} - {endDate.toLocaleDateString('es-MX')})
          </h3>
          <p className="text-xs text-[#8E8D8A] mt-1">Basado en fecha de creación. Total en periodo: {totalQuotations}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#D8D3CC]">
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Convertidas</p>
            <p className="text-3xl font-serif text-[#C5B358]">{convertida}</p>
            <p className="text-xs text-[#C5B358] font-medium mt-1">{formatPercent(convertida, totalQuotations)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Pendiente</p>
            <p className="text-3xl font-serif text-[#333333]">{pendiente}</p>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(pendiente, totalQuotations)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Seguimiento</p>
            <p className="text-3xl font-serif text-[#333333]">{enSeguimiento}</p>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(enSeguimiento, totalQuotations)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Oportunidad</p>
            <p className="text-3xl font-serif text-[#333333]">{oportunidad}</p>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(oportunidad, totalQuotations)}</p>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">Declinada</p>
            <p className="text-3xl font-serif text-[#333333]">{declinada}</p>
            <p className="text-xs text-[#8E8D8A] mt-1">{formatPercent(declinada, totalQuotations)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Expiring Quotations Alert */}
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

        {/* Overdue Production Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-600" size={20} />
            <h3 className="font-semibold text-red-900">Producción Atrasada</h3>
          </div>
          {overdueOrders.length === 0 ? (
            <p className="text-sm text-red-700/70">Todo en tiempo.</p>
          ) : (
            <ul className="space-y-3">
              {overdueOrders.map(o => (
                <li key={o.id} className="text-sm">
                  <Link href={`/ordenes/produccion`} className="text-red-800 hover:underline font-medium">
                    {o.id}
                  </Link>
                  <span className="text-red-700 ml-2">({o.quotation.clientNameOrUsername})</span>
                  <div className="text-red-600 text-xs mt-1">
                    Debió terminar: {o.estimatedProductionEnd?.toLocaleDateString('es-MX')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stones to Return / Archivable Quotations */}
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

        {/* Pending Follow-ups */}
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
                    {o.id}
                  </Link>
                  <span className="text-blue-700 ml-2">({o.quotation.clientNameOrUsername})</span>
                  <div className="text-blue-600 text-xs mt-1">
                    {o.stage}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
