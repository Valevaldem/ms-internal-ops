import prisma from "@/lib/prisma";
import Link from "next/link";
import { translateStage } from "@/lib/translations";
import CertificateActionButtons from "./CertificateActionButtons";
import CertificadosFilter from "./CertificadosFilter";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getGroupedStonesText(stones: any[]) {
  if (!stones || stones.length === 0) return null;
  const groups: Record<string, number> = {};
  stones.forEach(s => {
    if (!groups[s.stoneName]) groups[s.stoneName] = 0;
    groups[s.stoneName] += s.weightCt;
  });
  return Object.entries(groups)
    .map(([name, total]) => `${name}: ${total.toFixed(2)}ct`)
    .join(" | ");
}

export default async function CertificadosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor', 'certificate_operator'], "/");

  const params = await searchParams;
  const filter = typeof params.filter === 'string' ? params.filter : 'all';

  const activeStages = [
    "Producción",
    "Certificación",
    "Revisión final de asesora",
    "Creación de Guía",
    "Preparando envío",
    "Listo para entrega"
  ];

  // Base active where clause
  let activeWhereClause: any = {
    stage: { in: activeStages },
    certificateDeliveredToAdvisor: false,
  };

  // ADVISOR FILTER — solo sus propias órdenes
  if (user.role === 'advisor' && user.salesAssociateId) {
    activeWhereClause.quotation = {
      salesAssociateId: user.salesAssociateId
    };
  }

  // Apply UI filters
  if (filter === "review") {
    activeWhereClause.certificateNeedsReview = true;
  } else if (filter === "missing_vinyl") {
    activeWhereClause.certificateVinylReady = false;
    activeWhereClause.isCertificatePending = false;
  } else if (filter === "missing_printed") {
    activeWhereClause.certificatePrintedReady = false;
    activeWhereClause.isCertificatePending = false;
  } else if (filter === "missing_photo") {
    activeWhereClause.certificatePhotoReady = false;
    activeWhereClause.isCertificatePending = false;
  } else if (filter === "ready") {
    activeWhereClause.certificateVinylReady = true;
    activeWhereClause.certificatePrintedReady = true;
    activeWhereClause.certificatePhotoReady = true;
    activeWhereClause.certificateNeedsReview = false;
    activeWhereClause.isCertificatePending = false;
  }

  const activeOrders = await prisma.order.findMany({
    where: activeWhereClause,
    include: {
      quotation: {
        include: { salesAssociate: true, stones: true }
      }
    },
    orderBy: [{ certificateNeedsReview: 'desc' }, { updatedAt: 'desc' }]
  });

  // Completed orders — also filtered for advisors
  const completedWhereClause: any = { certificateDeliveredToAdvisor: true };
  if (user.role === 'advisor' && user.salesAssociateId) {
    completedWhereClause.quotation = { salesAssociateId: user.salesAssociateId };
  }

  const completedOrders = await prisma.order.findMany({
    where: completedWhereClause,
    include: {
      quotation: {
        include: { salesAssociate: true, stones: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">
            {user.role === 'advisor' ? 'Mis Certificados' : 'Operación de Certificados'}
          </h2>
          <p className="text-sm text-[#8E8D8A] mt-1">
            {user.role === 'advisor'
              ? 'Estado de los certificados de tus órdenes'
              : 'Vista operativa para preparar y completar certificados'}
          </p>
        </div>
      </div>

      {/* Filters — only show operational filters for non-advisors */}
      {user.role !== 'advisor' && <CertificadosFilter />}

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Folio / Asesora</th>
              <th className="px-6 py-4 font-medium">Etapa de la Orden</th>
              <th className="px-6 py-4 font-medium">Estado del Certificado</th>
              {user.role !== 'advisor' && (
                <th className="px-6 py-4 font-medium">Progreso Operativo</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {activeOrders.map(o => (
              <tr key={o.id} className={`hover:bg-[#F5F2EE]/50 transition-colors ${o.certificateNeedsReview ? 'bg-yellow-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <Link href={`/certificados/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex flex-col">
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

                  {getGroupedStonesText(o.quotation.stones) && (
                    <div className="text-xs text-[#8E8D8A] mt-2 bg-[#F5F2EE] inline-block px-2 py-1 rounded">
                      {getGroupedStonesText(o.quotation.stones)}
                    </div>
                  )}

                  {o.certificateNotes && (
                    <div className="text-xs text-[#8E8D8A] mt-2 italic border-l-2 border-[#D8D3CC] pl-2 whitespace-normal min-w-[200px] max-w-sm">
                      Nota: {o.certificateNotes}
                    </div>
                  )}
                </td>
                {user.role !== 'advisor' && (
                  <td className="px-6 py-4">
                    <CertificateActionButtons
                      orderId={o.id}
                      vinylReady={o.certificateVinylReady}
                      photoReady={o.certificatePhotoReady}
                      printedReady={o.certificatePrintedReady}
                      deliveredReady={o.certificateDeliveredToAdvisor}
                      needsReview={o.certificateNeedsReview}
                    />
                  </td>
                )}
              </tr>
            ))}

            {activeOrders.length === 0 && (
              <tr>
                <td colSpan={user.role !== 'advisor' ? 4 : 3} className="px-6 py-12 text-center text-[#8E8D8A]">
                  {user.role === 'advisor'
                    ? 'No tienes certificados pendientes en este momento.'
                    : 'No hay certificados pendientes en este momento.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Certificados Completados */}
      <div className="mt-12">
        <h3 className="text-xl font-serif text-[#333333] mb-4">Certificados Completados</h3>
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto opacity-75">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Folio / Asesora</th>
                <th className="px-6 py-4 font-medium">Etapa de la Orden</th>
                <th className="px-6 py-4 font-medium">Estado del Certificado</th>
                {user.role !== 'advisor' && (
                  <th className="px-6 py-4 font-medium">Progreso Operativo</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {completedOrders.map(o => (
                <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/certificados/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex flex-col">
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
                      <span className="text-xs font-medium px-2 py-1 rounded border text-green-700 bg-green-50 border-green-200 w-max inline-block">
                        ✓ Entregado a asesora
                      </span>
                    </div>
                    <div className="text-[#333333] font-medium text-sm">
                      {o.certificateTitle || <span className="text-red-500 italic">Sin Título</span>}
                    </div>
                    {getGroupedStonesText(o.quotation.stones) && (
                      <div className="text-xs text-[#8E8D8A] mt-2 bg-[#F5F2EE] inline-block px-2 py-1 rounded">
                        {getGroupedStonesText(o.quotation.stones)}
                      </div>
                    )}
                  </td>
                  {user.role !== 'advisor' && (
                    <td className="px-6 py-4">
                      <CertificateActionButtons
                        orderId={o.id}
                        vinylReady={o.certificateVinylReady}
                        photoReady={o.certificatePhotoReady}
                        printedReady={o.certificatePrintedReady}
                        deliveredReady={o.certificateDeliveredToAdvisor}
                        needsReview={false}
                      />
                    </td>
                  )}
                </tr>
              ))}

              {completedOrders.length === 0 && (
                <tr>
                  <td colSpan={user.role !== 'advisor' ? 4 : 3} className="px-6 py-12 text-center text-[#8E8D8A]">
                    No hay certificados completados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
