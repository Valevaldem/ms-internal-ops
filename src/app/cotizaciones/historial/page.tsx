import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function extendValidity(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const days = Number(formData.get("days") || 1);

  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (quotation) {
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

export default async function HistorialCotizaciones() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { quotationDate: 'desc' },
    include: { salesAssociate: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Historial de Cotizaciones</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Gestión y seguimiento de cotizaciones activas</p>
        </div>
        <Link href="/cotizaciones/nueva" className="bg-[#C5B358] text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-[#b0a04f] transition-colors shadow-sm">
          + Nueva Cotización
        </Link>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">ID / Cliente</th>
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
                    <div className="font-semibold text-[#333333]">{q.id.split('-')[0]}..</div>
                    <div className="text-xs text-[#8E8D8A] truncate max-w-[150px]">{q.clientNameOrUsername}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[#333333]">{q.modelName}</div>
                    <div className="text-xs text-[#8E8D8A]">{q.salesAssociate.name} ({q.salesChannel})</div>
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
                    <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                      q.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                      q.status === 'Sent' ? 'bg-blue-50 text-blue-600' :
                      q.status === 'Converted' ? 'bg-green-50 text-green-600' :
                      q.status === 'Expired' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {q.status !== 'Converted' && (
                      <Link href={`/ordenes/nueva?quotationId=${q.id}`} className="text-xs text-[#333333] hover:text-[#C5B358] font-medium transition-colors border-b border-transparent hover:border-[#C5B358] pb-0.5">
                        Convertir a Orden
                      </Link>
                    )}
                    {(isExpired || daysRemaining <= 3) && q.status !== 'Converted' && (
                      <form action={extendValidity} className="inline-block ml-4">
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="days" value="7" />
                        <button type="submit" className="text-[10px] bg-white border border-[#D8D3CC] text-[#8E8D8A] hover:text-[#333333] hover:border-[#333333] px-2 py-1 rounded transition-colors uppercase tracking-wider">
                          +7 Días
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
