import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import StatusSelect from "../[id]/status-select";
import FiltrosHistorial from "./FiltrosHistorial";

export const dynamic = "force-dynamic";

async function extendValidity(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const days = Number(formData.get("days") || 1);
  const user = await getCurrentUser();
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (quotation) {
    if (user.role === 'advisor' && quotation.salesAssociateId !== user.salesAssociateId) throw new Error("Unauthorized");
    const newDate = new Date(quotation.validUntil);
    newDate.setDate(newDate.getDate() + days);
    await prisma.quotation.update({
      where: { id },
      data: { validUntil: newDate, status: quotation.status === "Expired" ? "Extended" : quotation.status }
    });
    revalidatePath("/cotizaciones/historial");
  }
}

async function archiveQuotation(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const user = await getCurrentUser();
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (quotation && user.role === 'advisor' && quotation.salesAssociateId !== user.salesAssociateId) throw new Error("Unauthorized");
  await prisma.quotation.update({ where: { id }, data: { status: "Archived" } });
  revalidatePath("/cotizaciones/historial");
}

export default async function HistorialCotizaciones(props: {
  searchParams: Promise<{
    search?: string; tab?: string; view?: string; sort?: string;
    startDate?: string; endDate?: string; status?: string;
    advisorName?: string; salesChannel?: string;
  }>;
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor', 'stock_operator']);

  const sp = await props.searchParams;
  const search = sp.search || '';
  const tab = sp.tab || 'active';
  const view = sp.view || 'list';
  const sort = sp.sort || 'date_desc';
  const startDateStr = sp.startDate || '';
  const endDateStr = sp.endDate || '';
  const drillStatus = sp.status;
  const advisorName = sp.advisorName;
  const salesChannel = sp.salesChannel || '';

  const whereClause: any = search ? {
    OR: [
      { folio: { contains: search } },
      { clientNameOrUsername: { contains: search } },
      { modelName: { contains: search } },
      { manualPieceDescription: { contains: search } },
      { salesAssociate: { name: { contains: search } } }
    ]
  } : {};

  if ((user.role === 'advisor' || user.role === 'stock_operator') && user.salesAssociateId) {
    whereClause.salesAssociateId = user.salesAssociateId;
  }

  if (tab === 'archived') whereClause.status = 'Archived';
  else if (tab === 'drafts') whereClause.status = 'Borrador';
  else whereClause.status = { notIn: ['Archived', 'Borrador'] };

  if (startDateStr || endDateStr) {
    whereClause.quotationDate = {};
    if (startDateStr) whereClause.quotationDate.gte = new Date(startDateStr + 'T00:00:00');
    if (endDateStr) whereClause.quotationDate.lte = new Date(endDateStr + 'T23:59:59.999');
  }
  if (advisorName) whereClause.salesAssociate = { name: advisorName };
  if (salesChannel) whereClause.salesChannel = salesChannel;

  if (drillStatus) {
    if (drillStatus === 'convertida') { whereClause.order = { isNot: null }; delete whereClause.status; }
    else {
      whereClause.order = null;
      if (drillStatus === 'enSeguimiento') whereClause.status = 'En seguimiento';
      else if (drillStatus === 'oportunidad') whereClause.status = 'Oportunidad de cierre';
      else if (drillStatus === 'declinada') whereClause.status = 'Declinada';
      else if (drillStatus === 'pendiente') whereClause.status = { notIn: ['En seguimiento', 'Oportunidad de cierre', 'Declinada'] };
    }
  }

  let orderBy: any = { quotationDate: 'desc' };
  if (sort === 'date_asc') orderBy = { quotationDate: 'asc' };
  else if (sort === 'price_desc') orderBy = { finalClientPrice: 'desc' };
  else if (sort === 'price_asc') orderBy = { finalClientPrice: 'asc' };
  else if (sort === 'client_asc') orderBy = { clientNameOrUsername: 'asc' };

  const quotations = await prisma.quotation.findMany({
    where: whereClause, orderBy, include: { salesAssociate: true, order: true }
  });

  const draftCount = await prisma.quotation.count({
    where: {
      ...(user.role === 'advisor' && user.salesAssociateId ? { salesAssociateId: user.salesAssociateId } : {}),
      status: 'Borrador',
    }
  });

  const buildTabUrl = (targetTab: string) => {
    const p = new URLSearchParams()
    if (targetTab !== 'active') p.set('tab', targetTab)
    if (view !== 'list') p.set('view', view)
    if (sort !== 'date_desc') p.set('sort', sort)
    return `/cotizaciones/historial${p.toString() ? '?' + p.toString() : ''}`
  }

  const buildViewUrl = (targetView: string) => {
    const p = new URLSearchParams()
    if (tab !== 'active') p.set('tab', tab)
    if (targetView !== 'list') p.set('view', targetView)
    if (sort !== 'date_desc') p.set('sort', sort)
    if (search) p.set('search', search)
    if (startDateStr) p.set('startDate', startDateStr)
    if (endDateStr) p.set('endDate', endDateStr)
    if (salesChannel) p.set('salesChannel', salesChannel)
    return `/cotizaciones/historial${p.toString() ? '?' + p.toString() : ''}`
  }

  const statusColor: Record<string, string> = {
    'Pendiente de respuesta': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'En seguimiento': 'bg-blue-50 text-blue-700 border-blue-200',
    'Oportunidad de cierre': 'bg-purple-50 text-purple-700 border-purple-200',
    'Declinada': 'bg-red-50 text-red-600 border-red-200',
    'Converted': 'bg-green-50 text-green-700 border-green-200',
    'Borrador': 'bg-gray-50 text-gray-500 border-gray-200',
    'Archived': 'bg-gray-50 text-gray-400 border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Historial de Cotizaciones</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Gestión y seguimiento de cotizaciones activas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/cotizaciones/manual" className="bg-white text-[#C5B358] border border-[#C5B358] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F5F2EE] transition-colors shadow-sm whitespace-nowrap">+ Manual</Link>
          <Link href="/cotizaciones/nueva" className="bg-[#C5B358] text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-[#b0a04f] transition-colors shadow-sm whitespace-nowrap">+ Cotización</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#D8D3CC] mb-4">
        <Link href={buildTabUrl('active')} className={`pb-2 px-1 text-sm font-medium ${tab === 'active' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>Activas</Link>
        <Link href={buildTabUrl('drafts')} className={`pb-2 px-1 text-sm font-medium flex items-center gap-1.5 ${tab === 'drafts' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>
          Borradores
          {draftCount > 0 && <span className="text-[10px] bg-[#F5F2EE] border border-[#D8D3CC] text-[#8E8D8A] px-1.5 py-0.5 rounded-full font-semibold">{draftCount}</span>}
        </Link>
        <Link href={buildTabUrl('archived')} className={`pb-2 px-1 text-sm font-medium ${tab === 'archived' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>Archivadas</Link>
      </div>

      {/* Filtros automáticos */}
      <FiltrosHistorial
        tab={tab} view={view} sort={sort} search={search}
        startDate={startDateStr} endDate={endDateStr}
        salesChannel={salesChannel} isManager={user.role === 'manager'}
      />

      {/* Toggle vista */}
      <div className="flex justify-end gap-2 mb-2">
        <Link href={buildViewUrl('list')} className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${view === 'list' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-[#8E8D8A] border-[#D8D3CC] hover:bg-[#F5F2EE]'}`}>☰ Lista</Link>
        <Link href={buildViewUrl('grid')} className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${view === 'grid' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-[#8E8D8A] border-[#D8D3CC] hover:bg-[#F5F2EE]'}`}>⊞ Mosaico</Link>
      </div>

      {/* Contenido */}
      {quotations.length === 0 ? (
        <div className="bg-white border border-[#D8D3CC] rounded-lg px-6 py-12 text-center text-sm text-[#8E8D8A]">No hay cotizaciones en esta sección.</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotations.map(q => {
            const daysRemaining = Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / 86400000);
            const isExpired = daysRemaining < 0;
            const isConverted = !!q.order;
            return (
              <Link key={q.id} href={`/cotizaciones/${q.id}`} className="block bg-white border border-[#D8D3CC] rounded-lg p-5 hover:border-[#C5B358] hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-[#333333] group-hover:text-[#C5B358] transition-colors text-sm flex items-center gap-1.5">
                      {q.folio || q.id.split('-')[0] + '..'}
                      {q.type === 'Manual' && <span className="text-[9px] bg-[#F5F2EE] text-[#8E8D8A] px-1.5 py-0.5 rounded uppercase tracking-wider border border-[#D8D3CC]">Manual</span>}
                    </div>
                    <div className="text-xs text-[#8E8D8A] mt-0.5 truncate max-w-[140px]">{q.clientNameOrUsername}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor[q.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {isConverted ? 'Convertida' : q.status}
                  </span>
                </div>
                <div className="text-xs text-[#8E8D8A] mb-1">{q.type === 'Manual' ? q.manualPieceDescription : q.modelName}</div>
                <div className="text-xs text-[#8E8D8A] mb-3">{q.salesAssociate.name} · {q.salesChannel}</div>
                <div className="flex justify-between items-end">
                  <div className={`text-[10px] font-medium ${isExpired ? 'text-red-500' : daysRemaining <= 3 ? 'text-yellow-600' : 'text-[#8E8D8A]'}`}>
                    {isExpired ? `Vencida hace ${Math.abs(daysRemaining)}d` : `${daysRemaining}d restantes`}
                  </div>
                  <div className="font-serif text-[#C5B358] font-bold text-sm">${q.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#D8D3CC] rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Folio / Cliente</th>
                <th className="px-6 py-4 font-medium">Pieza / Asesor</th>
                <th className="px-6 py-4 font-medium">Vigencia</th>
                <th className="px-6 py-4 font-medium">Precio Final</th>
                <th className="px-6 py-4 font-medium text-center">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EE]">
              {quotations.map(q => {
                const daysRemaining = Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / 86400000);
                const isExpired = daysRemaining < 0;
                const isConverted = !!q.order;
                return (
                  <tr key={q.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/cotizaciones/${q.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex items-center gap-2">
                        {q.folio || q.id.split('-')[0] + '..'}
                        {q.type === 'Manual' && <span className="text-[10px] bg-[#F5F2EE] text-[#8E8D8A] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium border border-[#D8D3CC]">Manual</span>}
                        {q.status === 'Borrador' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium border border-gray-200">Borrador</span>}
                      </Link>
                      <div className="text-xs text-[#8E8D8A] truncate max-w-[150px]">{q.clientNameOrUsername}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#333333]">{q.type === 'Manual' ? q.pieceType : q.modelName}</div>
                      <div className="text-xs text-[#8E8D8A] truncate max-w-[200px]">{q.type === 'Manual' ? (q.manualPieceDescription || 'Sin descripción') : `${q.salesAssociate.name} (${q.salesChannel})`}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-medium text-sm ${isExpired ? 'text-red-500' : daysRemaining <= 3 ? 'text-yellow-600' : 'text-[#333333]'}`}>
                        {isExpired ? `Vencida hace ${Math.abs(daysRemaining)}d` : `${daysRemaining}d`}
                      </div>
                      <div className="text-xs text-[#8E8D8A]">{new Date(q.validUntil).toLocaleDateString('es-MX')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-serif text-[#C5B358] font-bold">${q.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isConverted ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border bg-green-50 text-green-700 border-green-200">Convertida</span>
                      ) : q.status === 'Borrador' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border bg-gray-50 text-gray-500 border-gray-200">Borrador</span>
                      ) : (
                        <StatusSelect id={q.id} currentStatus={q.status} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {!isConverted && q.status !== 'Borrador' && (
                          <form action={extendValidity} className="inline-flex items-center gap-1">
                            <input type="hidden" name="id" value={q.id} />
                            <input type="hidden" name="days" value="7" />
                            <button type="submit" className="text-xs text-[#8E8D8A] hover:text-[#333333] transition-colors">+7 días</button>
                          </form>
                        )}
                        {!isConverted && q.status !== 'Borrador' && tab !== 'archived' && (
                          <form action={archiveQuotation} className="inline-block">
                            <input type="hidden" name="id" value={q.id} />
                            <button type="submit" className="text-xs text-[#8E8D8A] hover:text-red-500 transition-colors">Archivar</button>
                          </form>
                        )}
                        {!isConverted && q.status !== 'Archived' && (
                          <Link href={`/ordenes/nueva?quotationId=${q.id}`} className="text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors">→ Convertir</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
