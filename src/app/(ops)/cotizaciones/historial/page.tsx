import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import StatusSelect from "../[id]/status-select";
import SalesChannelFilter from "@/components/SalesChannelFilter";

export const dynamic = "force-dynamic";

async function extendValidity(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const days = Number(formData.get("days") || 1);
  const user = await getCurrentUser();

  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (quotation) {
    if (user.role === 'advisor' && quotation.salesAssociateId !== user.salesAssociateId) {
      throw new Error("Unauthorized");
    }

    const newDate = new Date(quotation.validUntil);
    newDate.setDate(newDate.getDate() + days);

    await prisma.quotation.update({
      where: { id },
      data: {
        validUntil: newDate,
        status: quotation.status === "Expired" ? "Extended" : quotation.status
      }
    });
    revalidatePath("/cotizaciones/historial");
  }
}

async function archiveQuotation(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const user = await getCurrentUser();

  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (quotation && user.role === 'advisor' && quotation.salesAssociateId !== user.salesAssociateId) {
    throw new Error("Unauthorized");
  }

  await prisma.quotation.update({
    where: { id },
    data: { status: "Archived" }
  });
  revalidatePath("/cotizaciones/historial");
}

export default async function HistorialCotizaciones(props: {
  searchParams: Promise<{
    search?: string,
    tab?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    advisorName?: string,
    salesChannel?: string
  }>
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor']);

  const searchParams = await props.searchParams;
  const search = searchParams.search || '';
  const tab = searchParams.tab || 'active';

  // Drill-down parameters from dashboard
  const startDateStr = searchParams.startDate;
  const endDateStr = searchParams.endDate;
  const drillStatus = searchParams.status;
  const advisorName = searchParams.advisorName;
  const salesChannel = searchParams.salesChannel;

  const whereClause: any = search ? {
    OR: [
      { folio: { contains: search } },
      { clientNameOrUsername: { contains: search } },
      { modelName: { contains: search } },
      { manualPieceDescription: { contains: search } },
      { salesAssociate: { name: { contains: search } } }
    ]
  } : {};

  // Enforce ownership visibility
  if (user.role === 'advisor' && user.salesAssociateId) {
    whereClause.salesAssociateId = user.salesAssociateId;
  }

  if (tab === 'archived') {
    whereClause.status = 'Archived';
  } else {
    // Basic unarchived condition (overridden below if drillStatus is used)
    whereClause.status = { not: 'Archived' };
  }

  // Apply dashboard drill-down filters
  if (startDateStr || endDateStr) {
    whereClause.quotationDate = {};
    if (startDateStr) whereClause.quotationDate.gte = new Date(startDateStr + 'T00:00:00');
    if (endDateStr) whereClause.quotationDate.lte = new Date(endDateStr + 'T23:59:59.999');
  }

  if (advisorName) {
    whereClause.salesAssociate = { name: advisorName };
  }

  if (salesChannel) {
    whereClause.salesChannel = salesChannel;
  }

  if (drillStatus) {
    if (drillStatus === 'convertida') {
      whereClause.order = { isNot: null };
      delete whereClause.status; // order presence implies converted
    } else {
      whereClause.order = null; // Ensure mutually exclusive buckets
      if (drillStatus === 'enSeguimiento') {
        whereClause.status = 'En seguimiento';
      } else if (drillStatus === 'oportunidad') {
        whereClause.status = 'Oportunidad de cierre';
      } else if (drillStatus === 'declinada') {
        whereClause.status = 'Declinada';
      } else if (drillStatus === 'pendiente') {
        // Catch-all for pendiente, matching the dashboard logic which simply uses `else { pendiente++ }`
        whereClause.status = { notIn: ['En seguimiento', 'Oportunidad de cierre', 'Declinada'] };
      }
    }
  }

  const quotations = await prisma.quotation.findMany({
    where: whereClause,
    orderBy: { quotationDate: 'desc' },
    include: { salesAssociate: true, order: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Historial de Cotizaciones</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Gestión y seguimiento de cotizaciones activas</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <form className="flex-1 md:w-auto flex gap-2">
            {tab === 'archived' && <input type="hidden" name="tab" value="archived" />}
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Buscar por folio, cliente, asesor..."
              className="w-full md:w-64 border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358]"
            />
            {user.role === 'manager' && (
              <SalesChannelFilter defaultValue={salesChannel || ''} />
            )}
            {(search || salesChannel) && (
              <Link href={`/cotizaciones/historial${tab === 'archived' ? '?tab=archived' : ''}`} className="text-[#8E8D8A] hover:text-[#333333] flex items-center px-2 text-sm transition-colors">
                Limpiar
              </Link>
            )}
          </form>
          <div className="flex gap-2">
            <Link href="/cotizaciones/manual" className="bg-white text-[#C5B358] border border-[#C5B358] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F5F2EE] transition-colors shadow-sm whitespace-nowrap">
              + Manual
            </Link>
            <Link href="/cotizaciones/nueva" className="bg-[#C5B358] text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-[#b0a04f] transition-colors shadow-sm whitespace-nowrap">
              + Cotización
            </Link>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[#D8D3CC] mb-4">
        <Link href={`/cotizaciones/historial${search ? `?search=${search}` : ''}`} className={`pb-2 px-1 text-sm font-medium ${tab !== 'archived' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>
          Activas
        </Link>
        <Link href={`/cotizaciones/historial?tab=archived${search ? `&search=${search}` : ''}`} className={`pb-2 px-1 text-sm font-medium ${tab === 'archived' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>
          Archivadas
        </Link>
      </div>

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
              const daysRemaining = Math.ceil((new Date(q.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = daysRemaining < 0;

              return (
                <tr key={q.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/cotizaciones/${q.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors flex items-center gap-2">
                      {q.folio || q.id.split('-')[0] + '..'}
                      {q.type === 'Manual' && (
                        <span className="text-[10px] bg-[#F5F2EE] text-[#8E8D8A] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium border border-[#D8D3CC]">Manual</span>
                      )}
                    </Link>
                    <div className="text-xs text-[#8E8D8A] truncate max-w-[150px]">{q.clientNameOrUsername}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[#333333]">{q.type === 'Manual' ? q.pieceType : q.modelName}</div>
                    <div className="text-xs text-[#8E8D8A] truncate max-w-[200px]" title={q.type === 'Manual' ? q.manualPieceDescription || '' : ''}>
                      {q.type === 'Manual' ? (q.manualPieceDescription || 'Sin descripción') : `${q.salesAssociate.name} (${q.salesChannel})`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`font-medium ${isExpired ? 'text-red-500' : daysRemaining <= 3 ? 'text-amber-500' : 'text-[#333333]'}`}>
                      {q.validUntil.toLocaleDateString('es-MX')}
                    </div>
                    <div className="text-[10px] text-[#8E8D8A] uppercase">{isExpired ? 'Expirada' : `Faltan ${daysRemaining} días`}</div>
                  </td>
                  <td className="px-6 py-4 font-serif text-[#C5B358] whitespace-nowrap">
                    ${q.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusSelect id={q.id} currentStatus={q.order ? 'Converted' : q.status} />
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {!q.order && tab !== 'archived' && (
                      <Link href={`/ordenes/nueva?quotationId=${q.id}`} className="text-xs text-[#333333] hover:text-[#C5B358] font-medium transition-colors border-b border-transparent hover:border-[#C5B358] pb-0.5">
                        Convertir a Orden
                      </Link>
                    )}
                    {(isExpired || daysRemaining <= 3) && !q.order && tab !== 'archived' && (
                      <form action={extendValidity} className="inline-block ml-4">
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="days" value="7" />
                        <button type="submit" className="text-[10px] bg-white border border-[#D8D3CC] text-[#8E8D8A] hover:text-[#333333] hover:border-[#333333] px-2 py-1 rounded transition-colors uppercase tracking-wider">
                          +7 Días
                        </button>
                      </form>
                    )}
                    {tab !== 'archived' && !q.order && (
                      <form action={archiveQuotation} className="inline-block ml-4">
                        <input type="hidden" name="id" value={q.id} />
                        <button type="submit" className="text-[10px] bg-white border border-red-200 text-red-500 hover:text-white hover:bg-red-500 px-2 py-1 rounded transition-colors uppercase tracking-wider">
                          Archivar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}

            {quotations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#8E8D8A]">
                  No se encontraron cotizaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
