import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { salesAssociate: true, stones: true }
  });

  if (!quotation) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Detalle de Cotización</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">{quotation.folio || quotation.id}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/cotizaciones/historial" className="text-sm font-semibold text-[#8E8D8A] hover:text-[#333333] transition-colors bg-white border border-[#D8D3CC] px-4 py-2 rounded-md">
            Volver
          </Link>
          <Link href={`/cotizaciones/${quotation.id}/cliente`} className="bg-[#333333] text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-black transition-colors shadow-sm">
            Vista cliente
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Datos del Cliente</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-[#8E8D8A]">Cliente:</div>
            <div className="font-medium text-[#333333]">{quotation.clientNameOrUsername}</div>
            <div className="text-[#8E8D8A]">Teléfono:</div>
            <div className="font-medium text-[#333333]">{quotation.phoneNumber || '-'}</div>
            <div className="text-[#8E8D8A]">Canal:</div>
            <div className="font-medium text-[#333333]">{quotation.salesChannel}</div>
            <div className="text-[#8E8D8A]">Asesor:</div>
            <div className="font-medium text-[#333333]">{quotation.salesAssociate.name}</div>
          </div>
        </section>

        <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Datos de la Pieza</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-[#8E8D8A]">Tipo:</div>
            <div className="font-medium text-[#333333]">{quotation.pieceType}</div>
            <div className="text-[#8E8D8A]">Modelo:</div>
            <div className="font-medium text-[#333333]">{quotation.modelName}</div>
            <div className="text-[#8E8D8A]">Estado:</div>
            <div className="font-medium text-[#333333]">{quotation.status}</div>
            <div className="text-[#8E8D8A]">Válida hasta:</div>
            <div className="font-medium text-[#333333]">{quotation.validUntil.toLocaleDateString('es-MX')}</div>
          </div>
        </section>
      </div>

      <section className="bg-white border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-4 mb-6">
        <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2">Piedras Incluidas</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[#8E8D8A] bg-[#F5F2EE]">
            <tr>
              <th className="px-4 py-2 font-medium">Lote</th>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Cant</th>
              <th className="px-4 py-2 font-medium">Peso (ct)</th>
              <th className="px-4 py-2 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {quotation.stones.map((s: any) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-[#333333] uppercase">{s.lotCode}</td>
                <td className="px-4 py-3 text-[#333333]">{s.stoneName}</td>
                <td className="px-4 py-3 text-[#333333]">{s.quantity}</td>
                <td className="px-4 py-3 text-[#333333]">{s.weightCt}</td>
                <td className="px-4 py-3 text-right text-[#333333]">${s.stoneSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {quotation.stones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[#8E8D8A]">Sin piedras</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-[#F5F2EE]/50 border border-[#D8D3CC] p-6 rounded-lg shadow-sm space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#D8D3CC] pb-2 mb-4">Desglose Financiero (Uso Interno)</h3>
        <div className="flex justify-between text-sm">
          <span className="text-[#8E8D8A]">Base del Modelo:</span>
          <span>${quotation.modelBasePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8E8D8A]">Subtotal Piedras:</span>
          <span>${quotation.totalStonesPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        {quotation.msInternalAdjustment > 0 && (
          <div className="flex justify-between text-sm text-[#C5B358] font-medium">
            <span>Ajuste MS (+):</span>
            <span>${quotation.msInternalAdjustment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {quotation.marginProtectionAmount > 0 && (
          <div className="flex justify-between text-sm text-[#C5B358] font-medium">
            <span>Ajuste Interno (+):</span>
            <span>${quotation.marginProtectionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-serif pt-4 mt-4 border-t border-[#D8D3CC]">
          <span>Precio Final Cliente:</span>
          <span className="text-[#C5B358] font-semibold">${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
      </section>
    </div>
  );
}