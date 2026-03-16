import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import OrderForm from "./components/OrderForm";

export const dynamic = "force-dynamic";

export default async function NuevaOrdenPage({ searchParams }: { searchParams: Promise<{ quotationId?: string }> }) {
  const params = await searchParams;
  const qid = params.quotationId;

  if (!qid) {
    return (
      <div className="text-center py-20 text-[#8E8D8A]">
        Selecciona una cotización válida del historial para convertir a orden.
        <br/><Link href="/cotizaciones/historial" className="text-[#C5B358] hover:underline mt-4 inline-block">Ver Historial</Link>
      </div>
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: qid },
    include: { salesAssociate: true, stones: true }
  });

  if (!quotation) return <div>Cotización no encontrada.</div>;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-2xl font-serif text-[#333333] mb-6">Convertir Cotización a Orden</h2>

      <div className="bg-[#F5F2EE] p-6 rounded-lg mb-8 border border-[#D8D3CC]">
        <h3 className="text-sm font-semibold text-[#8E8D8A] uppercase tracking-wider mb-4 border-b border-[#D8D3CC] pb-2">Resumen de Cotización</h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="text-[#8E8D8A]">Cliente:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.clientNameOrUsername}</div>

          <div className="text-[#8E8D8A]">Pieza:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.modelName}</div>

          <div className="text-[#8E8D8A]">Piedras:</div>
          <div className="font-medium text-[#333333] text-right">
            {quotation.stones.map(s => `${s.lotCode} (${s.weightCt}ct)`).join(', ') || 'Ninguna'}
          </div>

          <div className="col-span-2 border-t border-[#D8D3CC] my-2"></div>

          <div className="text-[#8E8D8A]">Precio Final Cliente:</div>
          <div className="font-serif text-[#C5B358] text-right font-semibold">${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <OrderForm quotationId={qid} quotationStones={quotation.stones} />
    </div>
  );
}
