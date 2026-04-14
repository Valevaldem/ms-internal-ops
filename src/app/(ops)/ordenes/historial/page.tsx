import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { translateStage } from "@/lib/translations";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import SalesChannelFilter from "@/components/SalesChannelFilter";
export const dynamic = "force-dynamic";
export default async function PostVentaPage(props: { searchParams: Promise<{ tab?: string; salesChannel?: string }> }) {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "advisor"]);
  const searchParams = await props.searchParams;
  const tab = searchParams.tab || "active";
  const filterSalesChannel = searchParams.salesChannel || "";
  const whereClause: any = tab === "archived"
    ? { stage: "Cycle Closed" }
    : { stage: { in: ["Entregado","Post-Sale Follow-Up Pending (5 days)","Post-Sale Follow-Up Pending (1 month)"] } };
  if (filterSalesChannel) whereClause.quotation = { salesChannel: filterSalesChannel };
  if (user.role === "advisor" && user.salesAssociateId) {
    whereClause.quotation = { ...(whereClause.quotation || {}), salesAssociateId: user.salesAssociateId };
  }
  const orders = await prisma.order.findMany({
    where: whereClause,
    include: { quotation: { include: { salesAssociate: true } } },
    orderBy: { updatedAt: "desc" },
  });
  async function closeCycle(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.order.update({ where: { id }, data: { stage: "Cycle Closed" } });
    revalidatePath("/ordenes/historial");
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Post-venta</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Órdenes entregadas y seguimiento post-venta</p>
        </div>
        {user.role === "manager" && (
          <form className="flex w-full md:w-auto gap-2">
            {tab === "archived" && <input type="hidden" name="tab" value="archived" />}
            <SalesChannelFilter defaultValue={filterSalesChannel} />
            {filterSalesChannel && <Link href={`/ordenes/historial${tab === "archived" ? "?tab=archived" : ""}`} className="text-[#8E8D8A] hover:text-[#333333] flex items-center px-2 text-sm">Limpiar</Link>}
          </form>
        )}
      </div>
      <div className="flex gap-4 border-b border-[#D8D3CC] mb-4">
        <Link href="/ordenes/historial" className={`pb-2 px-1 text-sm font-medium ${tab !== "archived" ? "text-[#333333] border-b-2 border-[#C5B358]" : "text-[#8E8D8A] hover:text-[#333333]"}`}>En seguimiento</Link>
        <Link href="/ordenes/historial?tab=archived" className={`pb-2 px-1 text-sm font-medium ${tab === "archived" ? "text-[#333333] border-b-2 border-[#C5B358]" : "text-[#8E8D8A] hover:text-[#333333]"}`}>Ciclo cerrado</Link>
      </div>
      {tab !== "archived" && (
        <div className="bg-[#F5F2EE]/80 border border-[#D8D3CC] text-[#333333] p-4 rounded-lg text-sm mb-6 flex gap-3 items-start shadow-sm">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#C5B358]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div><span className="font-semibold block mb-1 text-[#C5B358]">Recordatorio antes de Cerrar Ciclo:</span>El ciclo solo debe cerrarse después de que el cliente haya confirmado la correcta recepción de su pieza.</div>
        </div>
      )}
      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Orden</th><th className="px-6 py-4 font-medium">Cliente / Asesora</th>
              <th className="px-6 py-4 font-medium">Pieza</th><th className="px-6 py-4 font-medium">Entrega</th>
              <th className="px-6 py-4 font-medium text-center">Etapa</th><th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                <td className="px-6 py-4"><Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors">{o.quotation.folio || o.quotation.id.split("-")[0] + ".."}</Link></td>
                <td className="px-6 py-4"><div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div><div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div></td>
                <td className="px-6 py-4"><div className="text-[#333333]">{o.quotation.type === "Manual" ? o.quotation.pieceType : o.quotation.modelName}</div><div className="text-xs text-[#8E8D8A]">${o.quotation.finalClientPrice.toLocaleString("es-MX")}</div></td>
                <td className="px-6 py-4 text-[#333333]">{o.deliveryMethod === "Store Pickup" ? "Tienda" : "Envío"}</td>
                <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block ${o.stage === "Cycle Closed" ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600"}`}>{translateStage(o.stage)}</span></td>
                <td className="px-6 py-4 text-right">{o.stage !== "Cycle Closed" ? (<form action={closeCycle} className="inline-block"><input type="hidden" name="id" value={o.id} /><button type="submit" className="text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors">Cerrar Ciclo</button></form>) : <span className="text-xs text-[#8E8D8A]">—</span>}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-[#8E8D8A]">No hay órdenes en esta sección.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}