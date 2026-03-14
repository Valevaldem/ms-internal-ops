import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function NuevaOrdenPage({ searchParams }: { searchParams: { quotationId?: string } }) {
  const qid = searchParams.quotationId;

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

  async function convertToOrder(formData: FormData) {
    "use server";

    const deliveryMethod = formData.get("deliveryMethod") as string;
    const refUrl = formData.get("referenceImageUrl") as string;
    const posTicket = formData.get("posTicketNumber") as string;

    // Create order and update quotation status
    await prisma.$transaction([
      prisma.order.create({
        data: {
          quotationId: qid!,
          deliveryMethod,
          referenceImageUrl: refUrl || null,
          posTicketNumber: posTicket || null,
          stage: "In Production",
          productionStartDate: new Date(),
          estimatedProductionEnd: new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000) // Simplistic +20 days
        }
      }),
      prisma.quotation.update({
        where: { id: qid },
        data: { status: "Converted" }
      })
    ]);

    revalidatePath("/cotizaciones/historial");
    revalidatePath("/ordenes/produccion");
    redirect("/ordenes/produccion");
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-2xl font-serif text-[#333333] mb-6">Convertir Cotización a Orden</h2>

      <div className="bg-[#F5F2EE] p-6 rounded-lg mb-8 border border-[#D8D3CC]">
        <h3 className="text-sm font-semibold text-[#8E8D8A] uppercase tracking-wider mb-4 border-b border-[#D8D3CC] pb-2">Resumen de Cotización - {quotation.folio || quotation.id}</h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="text-[#8E8D8A]">Cliente:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.clientNameOrUsername}</div>

          <div className="text-[#8E8D8A]">Pieza:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.modelName}</div>

          <div className="text-[#8E8D8A]">Piedras:</div>
          <div className="font-medium text-[#333333] text-right">
            {quotation.stones.map(s => `${s.quantity}x ${s.lotCode} (${s.weightCt}ct)`).join(', ') || 'Ninguna'}
          </div>

          <div className="col-span-2 border-t border-[#D8D3CC] my-2"></div>

          <div className="text-[#8E8D8A]">Precio Final Cliente:</div>
          <div className="font-serif text-[#C5B358] text-right font-semibold">${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <form action={convertToOrder} className="bg-white p-6 rounded-lg shadow-sm border border-[#D8D3CC] space-y-5">
        <h3 className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider mb-4 border-b border-[#F5F2EE] pb-2">Datos de la Orden</h3>

        <div>
          <label className="block text-sm text-[#333333] mb-1">Método de Entrega</label>
          <select name="deliveryMethod" required className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
            <option value="Store Pickup">Recolección en Tienda</option>
            <option value="Shipping">Envío por Paquetería</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#333333] mb-1">URL Imagen de Referencia (opcional)</label>
          <input type="url" name="referenceImageUrl" className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" placeholder="https://..." />
        </div>

        <div>
          <label className="block text-sm text-[#333333] mb-1">Número de Ticket POS (opcional)</label>
          <input type="text" name="posTicketNumber" className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
        </div>

        <div className="flex justify-end pt-4 border-t border-[#F5F2EE]">
          <Link href="/cotizaciones/historial" className="px-4 py-2 text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors mr-4">
            Cancelar
          </Link>
          <button type="submit" className="bg-[#333333] hover:bg-black text-white px-8 py-2 rounded text-sm uppercase tracking-wider font-semibold transition-colors">
            Generar Orden
          </button>
        </div>
      </form>
    </div>
  );
}
