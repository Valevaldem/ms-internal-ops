import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { translateStage } from "@/lib/translations";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HistorialOrdenesPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor']);

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'active';

  const whereClause: any = tab === 'archived'
    ? { stage: 'Cycle Closed' }
    : { stage: { in: ["Entregado", "Post-Sale Follow-Up Pending (5 days)", "Post-Sale Follow-Up Pending (1 month)"] } };

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: { quotation: { include: { salesAssociate: true } } },
    orderBy: { updatedAt: 'desc' }
  });

  async function closeCycle(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.order.update({
      where: { id },
      data: { stage: "Cycle Closed" }
    });
    revalidatePath("/ordenes/historial");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Historial de Órdenes Completadas</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Registro de órdenes entregadas y seguimientos post-venta</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[#D8D3CC] mb-4">
        <Link href={`/ordenes/historial`} className={`pb-2 px-1 text-sm font-medium ${tab !== 'archived' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>
          Activas
        </Link>
        <Link href={`/ordenes/historial?tab=archived`} className={`pb-2 px-1 text-sm font-medium ${tab === 'archived' ? 'text-[#333333] border-b-2 border-[#C5B358]' : 'text-[#8E8D8A] hover:text-[#333333]'}`}>
          Cerradas (Archivo)
        </Link>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Orden</th>
              <th className="px-6 py-4 font-medium">Cliente / Asesor</th>
              <th className="px-6 py-4 font-medium">Pieza</th>
              <th className="px-6 py-4 font-medium">Entrega</th>
              <th className="px-6 py-4 font-medium text-center">Etapa Actual</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors">
                    {o.quotation.folio || o.quotation.id.split('-')[0] + '..'}
                  </Link>
                  <div className="text-[10px] text-[#8E8D8A] uppercase tracking-wider mt-1">ID: {o.id.split('-')[0]}..</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div>
                  <div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[#333333]">{o.quotation.modelName}</div>
                  <div className="text-xs text-[#8E8D8A]">
                    ${o.quotation.finalClientPrice.toLocaleString('es-MX')}
                  </div>
                </td>
                <td className="px-6 py-4 text-[#333333]">
                  {o.deliveryMethod === 'Store Pickup' ? 'Tienda' : 'Envío'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block ${
                    o.stage === 'Cycle Closed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {translateStage(o.stage)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {o.stage !== "Cycle Closed" ? (
                    <form action={closeCycle} className="inline-block">
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors">
                        Cerrar Ciclo
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-[#8E8D8A]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#8E8D8A]">
                  No hay órdenes completadas o en seguimiento post-venta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
