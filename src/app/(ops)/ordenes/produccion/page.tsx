import prisma from "@/lib/prisma";
import Link from "next/link";
import { Clock, CheckCircle } from "lucide-react";
import { revalidatePath } from "next/cache";
import { translateStage } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function ProduccionPage() {
  const orders = await prisma.order.findMany({
    where: { stage: { notIn: ["Entregado", "Post-Sale Follow-Up Pending (5 days)", "Post-Sale Follow-Up Pending (1 month)", "Cycle Closed"] } },
    include: { quotation: { include: { salesAssociate: true } } },
    orderBy: { createdAt: 'asc' }
  });

  async function advanceStage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const stage = formData.get("stage") as string;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");

    if (stage === "Certificación" && order.isCertificatePending) {
      throw new Error("No se puede avanzar la etapa porque el certificado está pendiente de confirmación.");
    }

    let nextStage = stage;
    if (stage === "Por confirmar diseño final") nextStage = "Producción";
    else if (stage === "Producción") nextStage = "Certificación";
    else if (stage === "Certificación") {
      nextStage = order.deliveryMethod === 'Shipping' ? "Revisión final de asesora" : "Listo para entrega";
    }
    else if (stage === "Revisión final de asesora" && order.deliveryMethod === 'Shipping') {
      if (order.paymentStatus !== "Liquidado") {
        throw new Error("No se puede preparar el envío porque el pago no ha sido liquidado.");
      }
      nextStage = "Preparando envío";
    }
    else if (stage === "Preparando envío" && order.deliveryMethod === 'Shipping') {
      nextStage = "En tránsito";
    }
    else if (stage === "Listo para entrega" && order.deliveryMethod === 'Store Pickup') {
      nextStage = "Entregado";
    }
    else if (stage === "En tránsito") nextStage = "Entregado";

    if (nextStage === stage) return; // No change

    const isMovingToProduction = nextStage === "Producción";

    await prisma.order.update({
      where: { id },
      data: {
        stage: nextStage,
        ...(isMovingToProduction ? {
          productionStartDate: new Date(),
          estimatedProductionEnd: new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000)
        } : {}),
        stageHistory: {
          create: { stage: nextStage }
        }
      }
    });
    revalidatePath("/ordenes/produccion");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Seguimiento de Producción</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Control de órdenes activas y tiempos</p>
        </div>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Orden / Cotización</th>
              <th className="px-6 py-4 font-medium">Cliente / Asesor</th>
              <th className="px-6 py-4 font-medium">Pieza</th>
              <th className="px-6 py-4 font-medium text-center">Progreso</th>
              <th className="px-6 py-4 font-medium text-right">Etapa Actual</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {orders.map(o => {
              const start = o.productionStartDate ? new Date(o.productionStartDate).getTime() : new Date().getTime();
              const now = new Date().getTime();
              const daysElapsed = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
              const totalDays = 20; // Simplified 20 business days

              const isOverdue = daysElapsed > totalDays && o.stage === "Producción";
              const showProductionTimer = ["Producción", "Certificación", "Revisión final de asesora", "Preparando envío", "Listo para entrega", "En tránsito", "Entregado"].includes(o.stage);

              // Only start counter when order enters 'Producción'
              const productionTimerActive = showProductionTimer && o.productionStartDate;

              return (
                <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors">
                      {o.quotation.folio || o.quotation.id.split('-')[0] + '..'}
                    </Link>
                    <div className="text-[10px] text-[#8E8D8A] uppercase tracking-wider mt-1">ID: {o.id.split('-')[0]}..</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div>
                    <div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[#333333]">{o.quotation.modelName}</div>
                    <div className="text-xs text-[#8E8D8A] truncate max-w-[120px]">
                      {o.deliveryMethod === 'Store Pickup' ? 'Recoger Tienda' : 'Envío'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {productionTimerActive ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-full bg-[#F5F2EE] rounded-full h-1.5 mb-1 relative overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-[#C5B358]'}`}
                            style={{ width: `${Math.min(100, (daysElapsed / totalDays) * 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-semibold tracking-wider ${isOverdue ? 'text-red-500' : 'text-[#8E8D8A]'}`}>
                          {daysElapsed}/{totalDays} días hábiles
                        </span>
                      </div>
                    ) : o.stage === "Por confirmar diseño final" ? (
                      <div className="flex justify-center text-[#8E8D8A] text-[10px] tracking-wider uppercase">
                         Esperando confirmación
                      </div>
                    ) : (
                      <div className="flex justify-center text-green-500">
                        <CheckCircle size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">
                      {translateStage(o.stage)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {o.stage === "Certificación" && o.isCertificatePending ? (
                      <span className="text-[10px] text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                        Bloqueado: Certificado Pendiente
                      </span>
                    ) : o.stage === "Revisión final de asesora" && o.paymentStatus !== "Liquidado" ? (
                      <span className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                        Bloqueado: Pago Parcial
                      </span>
                    ) : (
                      <form action={advanceStage} className="inline-block">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="stage" value={o.stage} />
                        <button type="submit" className="text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors">
                          Avanzar Etapa
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}

            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#8E8D8A]">
                  No hay órdenes en producción.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
