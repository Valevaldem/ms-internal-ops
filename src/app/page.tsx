import prisma from "@/lib/prisma";
import { AlertCircle, Clock, FileWarning, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
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
      stage: { in: ["In Production"] },
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif text-[#333333]">Resumen Operativo</h2>
        <p className="text-[#8E8D8A] mt-1">Alertas internas y estado actual</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    {q.id}
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
