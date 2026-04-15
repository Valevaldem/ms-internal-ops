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
  return Object.entries(groups).map(([name, total]) => `${name}: ${total.toFixed(2)}ct`).join(" | ");
}

export default async function CertificadosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "advisor", "certificate_operator"], "/");

  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "all";

  const activeStages = ["Producción","Certificación","Revisión final de asesora","Creación de Guía","Preparando envío","Listo para entrega"];

  let activeWhereClause: any = {
    stage: { in: activeStages },
    certificateDeliveredToAdvisor: false,
  };

  if (user.role === "advisor" && user.salesAssociateId) {
    activeWhereClause.quotation = { salesAssociateId: user.salesAssociateId };
  }

  if (filter === "review") activeWhereClause.certificateNeedsReview = true;
  else if (filter === "missing_vinyl") { activeWhereClause.certificateVinylReady = false; activeWhereClause.isCertificatePending = false; }
  else if (filter === "missing_printed") { activeWhereClause.certificatePrintedReady = false; activeWhereClause.isCertificatePending = false; }
  else if (filter === "missing_photo") { activeWhereClause.certificatePhotoReady = false; activeWhereClause.isCertificatePending = false; }
  else if (filter === "ready") {
    activeWhereClause.certificateVinylReady = true;
    activeWhereClause.certificatePrintedReady = true;
    activeWhereClause.certificatePhotoReady = true;
    activeWhereClause.certificateNeedsReview = false;
    activeWhereClause.isCertificatePending = false;
  }

  const activeOrders = await prisma.order.findMany({
    where: activeWhereClause,
    include: { quotation: { include: { salesAssociate: true, stones: true } } },
    orderBy: [{ certificateNeedsReview: "desc" }, { updatedAt: "desc" }]
  });

  const completedWhereClause: any = { certificateDeliveredToAdvisor: true };
  if (user.role === "advisor" && user.salesAssociateId) {
    completedWhereClause.quotation = { salesAssociateId: user.salesAssociateId };
  }

  const completedOrders = await prisma.order.findMany({
    where: completedWhereClause,
    include: { quotation: { include: { salesAssociate: true, stones: true } } },
    orderBy: { updatedAt: "desc" }
  });

  // Dashboard counters para certificate_operator y manager
  const totalPending = activeOrders.length;
  const needsReview = activeOrders.filter(o => o.certificateNeedsReview).length;
  const pendingAdvisor = activeOrders.filter(o => o.isCertificatePending).length;
  const missingVinyl = activeOrders.filter(o => !o.certificateVinylReady && !o.isCertificatePending).length;
  const missingPhoto = activeOrders.filter(o => !o.certificatePhotoReady && !o.isCertificatePending).length;
  const readyToFinish = activeOrders.filter(o => o.certificateVinylReady && o.certificatePrintedReady && o.certificatePhotoReady && !o.certificateNeedsReview && !o.isCertificatePending).length;

  const isCertOp = user.role === "certificate_operator";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">
            {user.role === "advisor" ? "Mis Certificados" : "Operación de Certificados"}
          </h2>
          <p className="text-sm text-[#8E8D8A] mt-1">
            {user.role === "advisor" ? "Estado de los certificados de tus órdenes" : "Vista operativa para preparar y completar certificados"}
          </p>
        </div>
        {isCertOp && (
          <Link href="/certificados/manual" className="bg-[#C5B358] text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#b0a04f] transition-colors">
            + Cert. Manual
          </Link>
        )}
      </div>

      {/* Dashboard contadores — solo para cert_operator y manager */}
      {(isCertOp || user.role === "manager") && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total pendientes", value: totalPending, color: "bg-[#F5F2EE] text-[#333333]", filter: "all" },
            { label: "Requiere revisión", value: needsReview, color: "bg-yellow-50 text-yellow-700", filter: "review" },
            { label: "Pend. asesora", value: pendingAdvisor, color: "bg-red-50 text-red-600", filter: "all" },
            { label: "Falta vinil", value: missingVinyl, color: "bg-orange-50 text-orange-600", filter: "missing_vinyl" },
            { label: "Falta foto", value: missingPhoto, color: "bg-purple-50 text-purple-600", filter: "missing_photo" },
            { label: "Listos", value: readyToFinish, color: "bg-green-50 text-green-700", filter: "ready" },
          ].map(c => (
            <Link key={c.filter + c.label} href={`/certificados${c.filter !== "all" ? `?filter=${c.filter}` : ""}`}
              className={`${c.color} rounded-lg p-4 border border-[#D8D3CC] hover:shadow-md transition-shadow text-center`}>
              <div className="text-2xl font-bold font-serif">{c.value}</div>
              <div className="text-xs mt-1 font-medium">{c.label}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      {user.role !== "advisor" && <CertificadosFilter />}

      {/* MOSAICO para certificate_operator, tabla para otros */}
      {isCertOp ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOrders.map(o => (
            <div key={o.id} className={`bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-3 ${o.certificateNeedsReview ? "border-yellow-300" : "border-[#D8D3CC]"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <Link href={`/certificados/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors text-sm">
                    {o.quotation.folio || o.quotation.id.split("-")[0] + ".."}
                  </Link>
                  <div className="text-xs text-[#8E8D8A] mt-0.5">{o.quotation.salesAssociate.name}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                  o.isCertificatePending ? "bg-red-50 text-red-700 border-red-200" :
                  o.certificateNeedsReview ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                  (o.certificateVinylReady && o.certificatePrintedReady && o.certificatePhotoReady) ? "bg-green-50 text-green-700 border-green-200" :
                  "bg-gray-50 text-gray-500 border-gray-200"
                }`}>
                  {o.isCertificatePending ? "Pend. asesora" :
                   o.certificateNeedsReview ? "Revisión" :
                   (o.certificateVinylReady && o.certificatePrintedReady && o.certificatePhotoReady) ? "✓ Listo" : "Por hacer"}
                </span>
              </div>

              {!o.isCertificatePending && (
                <div className="text-sm font-medium text-[#333333]">
                  {o.certificateTitle || <span className="text-red-400 italic text-xs">Sin título</span>}
                </div>
              )}

              {getGroupedStonesText(o.quotation.stones) && (
                <div className="text-xs text-[#8E8D8A] bg-[#F5F2EE] px-2 py-1 rounded">{getGroupedStonesText(o.quotation.stones)}</div>
              )}

              {o.certificateNotes && (
                <div className="text-xs text-[#8E8D8A] italic border-l-2 border-[#D8D3CC] pl-2">{o.certificateNotes}</div>
              )}

              <div className="mt-auto pt-2 border-t border-[#F5F2EE]">
                <CertificateActionButtons
                  orderId={o.id}
                  vinylReady={o.certificateVinylReady}
                  photoReady={o.certificatePhotoReady}
                  printedReady={o.certificatePrintedReady}
                  deliveredReady={o.certificateDeliveredToAdvisor}
                  needsReview={o.certificateNeedsReview}
                />
              </div>
            </div>
          ))}
          {activeOrders.length === 0 && (
            <div className="col-span-3 bg-white border border-[#D8D3CC] rounded-lg p-12 text-center text-[#8E8D8A]">
              No hay certificados pendientes.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Folio / Asesora</th>
                <th className="px-6 py-4 font-medium">Etapa</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                {user.role !== "advisor" && <th className="px-6 py-4 font-medium">Progreso</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {activeOrders.map(o => (
                <tr key={o.id} className={`hover:bg-[#F5F2EE]/50 transition-colors ${o.certificateNeedsReview ? "bg-yellow-50/50" : ""}`}>
                  <td className="px-6 py-4">
                    <Link href={`/certificados/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors">{o.quotation.folio || o.quotation.id.split("-")[0] + ".."}</Link>
                    <div className="text-xs text-[#8E8D8A] mt-1">{o.quotation.salesAssociate.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">{translateStage(o.stage)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="mb-1">
                      {o.isCertificatePending ? <span className="text-xs font-medium px-2 py-1 rounded border text-red-700 bg-red-50 border-red-200">Pendiente de Asesora</span>
                      : o.certificateNeedsReview ? <span className="text-xs font-medium px-2 py-1 rounded border text-yellow-700 bg-yellow-100 border-yellow-300">⚠️ Revisión</span>
                      : (o.certificateVinylReady && o.certificatePrintedReady && o.certificatePhotoReady) ? <span className="text-xs font-medium px-2 py-1 rounded border text-green-700 bg-green-50 border-green-200">✓ Listo</span>
                      : <span className="text-xs font-medium px-2 py-1 rounded border text-gray-600 bg-gray-50 border-gray-200">Por hacer</span>}
                    </div>
                    {!o.isCertificatePending && <div className="text-sm font-medium text-[#333333]">{o.certificateTitle || <span className="text-red-500 italic">Sin Título</span>}</div>}
                    {getGroupedStonesText(o.quotation.stones) && <div className="text-xs text-[#8E8D8A] mt-1 bg-[#F5F2EE] inline-block px-2 py-1 rounded">{getGroupedStonesText(o.quotation.stones)}</div>}
                    {o.certificateNotes && <div className="text-xs text-[#8E8D8A] mt-1 italic border-l-2 border-[#D8D3CC] pl-2">{o.certificateNotes}</div>}
                  </td>
                  {user.role !== "advisor" && (
                    <td className="px-6 py-4">
                      <CertificateActionButtons orderId={o.id} vinylReady={o.certificateVinylReady} photoReady={o.certificatePhotoReady} printedReady={o.certificatePrintedReady} deliveredReady={o.certificateDeliveredToAdvisor} needsReview={o.certificateNeedsReview} />
                    </td>
                  )}
                </tr>
              ))}
              {activeOrders.length === 0 && (
                <tr><td colSpan={user.role !== "advisor" ? 4 : 3} className="px-6 py-12 text-center text-[#8E8D8A]">No hay certificados pendientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Completados */}
      <div className="mt-8">
        <h3 className="text-lg font-serif text-[#333333] mb-3">Completados ({completedOrders.length})</h3>
        <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto opacity-75">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Folio / Asesora</th>
                <th className="px-6 py-4 font-medium">Etapa</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                {user.role !== "advisor" && <th className="px-6 py-4 font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {completedOrders.map(o => (
                <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/certificados/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors">{o.quotation.folio || o.quotation.id.split("-")[0] + ".."}</Link>
                    <div className="text-xs text-[#8E8D8A] mt-1">{o.quotation.salesAssociate.name}</div>
                  </td>
                  <td className="px-6 py-4"><span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">{translateStage(o.stage)}</span></td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 rounded border text-green-700 bg-green-50 border-green-200">✓ Entregado</span>
                    <div className="text-sm font-medium text-[#333333] mt-1">{o.certificateTitle || <span className="text-red-500 italic">Sin Título</span>}</div>
                  </td>
                  {user.role !== "advisor" && (
                    <td className="px-6 py-4">
                      <CertificateActionButtons orderId={o.id} vinylReady={o.certificateVinylReady} photoReady={o.certificatePhotoReady} printedReady={o.certificatePrintedReady} deliveredReady={o.certificateDeliveredToAdvisor} needsReview={false} />
                    </td>
                  )}
                </tr>
              ))}
              {completedOrders.length === 0 && (
                <tr><td colSpan={user.role !== "advisor" ? 4 : 3} className="px-6 py-12 text-center text-[#8E8D8A]">No hay certificados completados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}