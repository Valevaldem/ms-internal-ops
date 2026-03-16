import prisma from "@/lib/prisma";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const now = new Date();

  // Expiring quotations
  const expiringQuotations = await prisma.quotation.findMany({
    where: {
      status: { in: ["Sent", "Waiting for Response", "In Follow-Up", "Extended"] },
      validUntil: { lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { validUntil: 'asc' }
  });

  // Overdue orders
  const overdueOrders = await prisma.order.findMany({
    where: {
      stage: { in: ["Producción"] },
      estimatedProductionEnd: { lt: now }
    },
    include: { quotation: true }
  });

  // Pending Follow-ups
  const pendingFollowUps = await prisma.order.findMany({
    where: {
      OR: [
        { stage: "Post-Sale Follow-Up Pending (5 days)", postSale5DaysDate: { lte: now } },
        { stage: "Post-Sale Follow-Up Pending (1 month)", postSale1MonthDate: { lte: now } }
      ]
    },
    include: { quotation: true }
  });

  const totalAlerts = expiringQuotations.length + overdueOrders.length + pendingFollowUps.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Alertas del Sistema</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">
            Tienes {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''} pendiente{totalAlerts !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-[#D8D3CC] mb-4" />
          <h3 className="text-lg font-medium text-[#333333]">Todo en orden</h3>
          <p className="text-[#8E8D8A] mt-2">No tienes alertas pendientes de revisar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdueOrders.map(o => (
             <div key={o.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-red-900">Producción Atrasada</h4>
                    <p className="text-sm text-red-800 mt-1">
                      La orden de {o.quotation.clientNameOrUsername} debió terminar el {o.estimatedProductionEnd?.toLocaleDateString('es-MX')}.
                    </p>
                    <Link href="/ordenes/produccion" className="text-xs font-semibold text-red-600 hover:text-red-800 uppercase tracking-wider mt-2 inline-block">
                      Ver Producción
                    </Link>
                  </div>
                </div>
             </div>
          ))}

          {expiringQuotations.map(q => (
             <div key={q.id} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <Clock className="text-amber-500 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-amber-900">Cotización por Expirar</h4>
                    <p className="text-sm text-amber-800 mt-1">
                      Cotización de {q.clientNameOrUsername} ({q.modelName}) vence el {q.validUntil.toLocaleDateString('es-MX')}.
                    </p>
                    <Link href="/cotizaciones/historial" className="text-xs font-semibold text-amber-600 hover:text-amber-800 uppercase tracking-wider mt-2 inline-block">
                      Ir a Cotizaciones
                    </Link>
                  </div>
                </div>
             </div>
          ))}

          {pendingFollowUps.map(o => (
             <div key={o.id} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-blue-500 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-blue-900">Seguimiento Post-Venta</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Revisar orden de {o.quotation.clientNameOrUsername} - {o.stage}
                    </p>
                    <Link href="/ordenes/historial" className="text-xs font-semibold text-blue-600 hover:text-blue-800 uppercase tracking-wider mt-2 inline-block">
                      Historial de Órdenes
                    </Link>
                  </div>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
