import prisma from "@/lib/prisma";
import Link from "next/link";
import { Clock, CheckCircle } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ProduccionPage() {
  const orders = await prisma.order.findMany({
    where: { stage: { notIn: ["Delivered", "Post-Sale Follow-Up Pending (5 days)", "Post-Sale Follow-Up Pending (1 month)", "Cycle Closed"] } },
    include: { quotation: { include: { salesAssociate: true } } },
    orderBy: { createdAt: 'asc' }
  });

  async function advanceStage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const stage = formData.get("stage") as string;
    const nextStage = stage === "In Production" ? "Finished" :
                      stage === "Finished" ? "Ready for Store Pickup" : // Assuming pickup for simplicity
                      "Delivered";

    await prisma.order.update({
      where: { id },
      data: { stage: nextStage }
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

              const isOverdue = daysElapsed > totalDays && o.stage === "In Production";

              return (
                <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#333333]">{o.quotation.folio || `${o.id.split('-')[0]}..`}</div>
                    <div className="text-[10px] text-[#8E8D8A] uppercase tracking-wider mt-1">Ord: {o.id.split('-')[0]}..</div>
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
                    {o.stage === "In Production" ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-full bg-[#F5F2EE] rounded-full h-1.5 mb-1 relative overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-[#C5B358]'}`}
                            style={{ width: `${Math.min(100, (daysElapsed / totalDays) * 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-semibold tracking-wider ${isOverdue ? 'text-red-500' : 'text-[#8E8D8A]'}`}>
                          {daysElapsed}/{totalDays} Días
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-center text-green-500">
                        <CheckCircle size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">
                      {o.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={advanceStage} className="inline-block">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="stage" value={o.stage} />
                      <button type="submit" className="text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors">
                        Avanzar Etapa
                      </button>
                    </form>
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
