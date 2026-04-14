import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import OrderForm from "./components/OrderForm";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NuevaOrdenPage({ searchParams }: { searchParams: Promise<{ quotationId?: string }> }) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor']);

  const params = await searchParams;
  const qid = params.quotationId;

  if (!qid) {
    return (
      <div className="text-center py-20 text-[#8E8D8A]">
        Selecciona una cotización válida del historial para convertir a orden.
        <br /><Link href="/cotizaciones/historial" className="text-[#C5B358] hover:underline mt-4 inline-block">Ver Historial</Link>
      </div>
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: qid },
    include: { salesAssociate: true, stones: true }
  });

  if (!quotation) return <div>Cotización no encontrada.</div>;

  // Buscar versiones hermanas (mismo padre o hijos del padre) que no estén archivadas ni convertidas
  const ultimateParentId = quotation.parentQuotationId || quotation.id;
  const siblings = await prisma.quotation.findMany({
    where: {
      id: { not: qid },
      OR: [
        { id: ultimateParentId },
        { parentQuotationId: ultimateParentId },
      ],
      status: { notIn: ['Archived', 'Converted'] },
    },
    orderBy: { versionNumber: 'asc' },
  });

  async function archiveSiblings(formData: FormData) {
    "use server";
    const idsToArchive = formData.getAll("archiveId") as string[];
    if (idsToArchive.length > 0) {
      await prisma.quotation.updateMany({
        where: { id: { in: idsToArchive } },
        data: { status: "Archived" },
      });
    }
    revalidatePath("/cotizaciones/historial");
    redirect(`/ordenes/nueva?quotationId=${qid}`);
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-2xl font-serif text-[#333333] mb-6">Convertir Cotización a Orden</h2>

      {/* Resumen de cotización */}
      <div className="bg-[#F5F2EE] p-6 rounded-lg mb-6 border border-[#D8D3CC]">
        <h3 className="text-sm font-semibold text-[#8E8D8A] uppercase tracking-wider mb-4 border-b border-[#D8D3CC] pb-2">Resumen de Cotización</h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="text-[#8E8D8A]">Folio:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.folio || quotation.id}</div>

          <div className="text-[#8E8D8A]">Cliente:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.clientNameOrUsername}</div>

          <div className="text-[#8E8D8A]">Pieza:</div>
          <div className="font-medium text-[#333333] text-right">{quotation.type === 'Manual' ? quotation.manualPieceDescription : quotation.modelName}</div>

          {quotation.type !== 'Manual' && quotation.stones.length > 0 && (
            <>
              <div className="text-[#8E8D8A]">Piedras:</div>
              <div className="font-medium text-[#333333] text-right">
                {quotation.stones.map(s => `${s.stoneName} — Lote: ${s.lotCode} (${s.weightCt}ct)`).join(', ')}
              </div>
            </>
          )}

          <div className="col-span-2 border-t border-[#D8D3CC] my-2"></div>

          <div className="text-[#8E8D8A]">Precio Final Cliente:</div>
          <div className="font-serif text-[#C5B358] text-right font-semibold">
            ${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Versiones hermanas — preguntar qué hacer */}
      {siblings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Existen {siblings.length} versión{siblings.length > 1 ? 'es' : ''} activa{siblings.length > 1 ? 's' : ''} de esta cotización
          </h3>
          <p className="text-xs text-amber-700 mb-4">
            Selecciona cuáles archivar antes de convertir. Las que no archives quedarán activas en el historial.
          </p>
          <form action={archiveSiblings} className="space-y-2">
            {siblings.map(s => (
              <label key={s.id} className="flex items-center gap-3 bg-white border border-amber-200 rounded-md px-3 py-2 cursor-pointer hover:border-amber-400 transition-colors">
                <input type="checkbox" name="archiveId" value={s.id} defaultChecked className="rounded text-amber-500 focus:ring-amber-400" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-[#333333]">{s.folio || s.id.split('-')[0] + '..'}</span>
                  {s.versionNumber > 1 && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">v{s.versionNumber}</span>}
                </div>
                <span className="text-xs text-[#8E8D8A]">
                  ${s.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </label>
            ))}
            <div className="pt-3 flex justify-end">
              <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded text-sm font-semibold transition-colors">
                Archivar seleccionadas y continuar →
              </button>
            </div>
          </form>
        </div>
      )}

      <OrderForm quotationId={qid} quotationStones={quotation.stones} isManual={quotation.type === 'Manual'} />
    </div>
  );
}
