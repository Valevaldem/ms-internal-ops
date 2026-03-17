import prisma from "@/lib/prisma";
import Link from "next/link";
import { translateStage } from "@/lib/translations";
import CertificateActionButtons from "./CertificateActionButtons";

export const dynamic = "force-dynamic";

export default async function CertificadosPage() {
  const activeStages = [
    "Producción",
    "Certificación",
    "Revisión final de asesora",
    "Preparando envío",
    "Listo para entrega"
  ];

  const orders = await prisma.order.findMany({
    where: {
      stage: { in: activeStages },
    },
    include: {
      quotation: {
        include: {
          salesAssociate: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Operación de Certificados</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Vista operativa para preparar y completar certificados</p>
        </div>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Folio / Asesora</th>
              <th className="px-6 py-4 font-medium">Etapa de la Orden</th>
              <th className="px-6 py-4 font-medium">Estado del Certificado</th>
              <th className="px-6 py-4 font-medium">Progreso Operativo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {orders.map(o => (
              <tr key={o.id} className={`hover:bg-[#F5F2EE]/50 transition-colors ${o.certificateNeedsReview ? 'bg-yellow-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex flex-col">
                    <span>{o.quotation.folio || o.quotation.id.split('-')[0] + '..'}</span>
                  </Link>
                  <div className="text-xs text-[#8E8D8A] mt-1">{o.quotation.salesAssociate.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">
                    {translateStage(o.stage)}
                  </span>
                </td>
                <td className="px-6 py-4">
                    {o.isCertificatePending ? (
                         <span className="text-xs font-medium px-2 py-1 rounded border text-red-600 bg-red-50 border-red-200 block mb-2 w-max">
                            Pendiente de Asesora
                         </span>
                    ) : (
                        <div className="text-[#333333] font-medium mb-1">
                            {o.certificateTitle || <span className="text-red-500 italic">Sin Título</span>}
                        </div>
                    )}

                    {o.certificateNeedsReview && (
                        <span className="text-xs font-medium px-2 py-1 rounded border text-yellow-700 bg-yellow-100 border-yellow-300 flex items-center gap-1 w-max mt-2">
                           ⚠️ Información actualizada por asesora
                        </span>
                    )}
                </td>
                <td className="px-6 py-4">
                    <CertificateActionButtons
                        orderId={o.id}
                        vinylReady={o.certificateVinylReady}
                        printedReady={o.certificatePrintedReady}
                        photoReady={o.certificatePhotoReady}
                        needsReview={o.certificateNeedsReview}
                    />
                </td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[#8E8D8A]">
                  No hay certificados pendientes en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
