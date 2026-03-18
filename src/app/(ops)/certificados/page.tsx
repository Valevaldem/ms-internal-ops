import prisma from "@/lib/prisma";
import Link from "next/link";
import { translateStage } from "@/lib/translations";
import CertificateActionButtons from "./CertificateActionButtons";

export const dynamic = "force-dynamic";

import CertificadosFilter from "./CertificadosFilter";

export default async function CertificadosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const filter = typeof params.filter === 'string' ? params.filter : 'all';

  const activeStages = [
    "Producción",
    "Certificación",
    "Revisión final de asesora",
    "Preparando envío",
    "Listo para entrega"
  ];

    // Determine exact where clause based on filter
  let whereClause: any = {
    stage: { in: activeStages },
  };

  if (filter === "review") {
    whereClause.certificateNeedsReview = true;
  } else if (filter === "missing_vinyl") {
    whereClause.certificateVinylReady = false;
    whereClause.isCertificatePending = false;
  } else if (filter === "missing_printed") {
    whereClause.certificatePrintedReady = false;
    whereClause.isCertificatePending = false;
  } else if (filter === "missing_photo") {
    whereClause.certificatePhotoReady = false;
    whereClause.isCertificatePending = false;
  } else if (filter === "ready") {
    whereClause.certificateVinylReady = true;
    whereClause.certificatePrintedReady = true;
    whereClause.certificatePhotoReady = true;
    whereClause.certificateNeedsReview = false;
    whereClause.isCertificatePending = false;
  }

  const orders = await prisma.order.findMany({
    where: whereClause,

    include: {
      quotation: {
        include: {
          salesAssociate: true
        }
      }
    },
    orderBy: [{ certificateNeedsReview: 'desc' }, { updatedAt: 'desc' }]
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Operación de Certificados</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Vista operativa para preparar y completar certificados</p>
        </div>
      </div>

      <CertificadosFilter />


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
                    <div className="mb-2">
                      {o.isCertificatePending ? (
                        <span className="text-xs font-medium px-2 py-1 rounded border text-red-700 bg-red-50 border-red-200 w-max inline-block">
                          Pendiente de Asesora
                        </span>
                      ) : o.certificateNeedsReview ? (
                        <span className="text-xs font-medium px-2 py-1 rounded border text-yellow-700 bg-yellow-100 border-yellow-300 w-max inline-block">
                          ⚠️ Requiere Revisión
                        </span>
                      ) : (o.certificateVinylReady && o.certificatePrintedReady && o.certificatePhotoReady) ? (
                        <span className="text-xs font-medium px-2 py-1 rounded border text-green-700 bg-green-50 border-green-200 w-max inline-block">
                          ✓ Listo para finalizar
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded border text-gray-600 bg-gray-50 border-gray-200 w-max inline-block">
                          Por hacer
                        </span>
                      )}
                    </div>

                    {!o.isCertificatePending && (
                        <div className="text-[#333333] font-medium text-sm">
                            {o.certificateTitle || <span className="text-red-500 italic">Sin Título</span>}
                        </div>
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
