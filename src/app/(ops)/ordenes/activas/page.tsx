import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { translateStage } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function OrdenesActivasPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;

  const q = typeof searchParams.q === 'string' ? searchParams.q : '';
  const filterStage = typeof searchParams.stage === 'string' ? searchParams.stage : '';
  const filterDelivery = typeof searchParams.delivery === 'string' ? searchParams.delivery : '';
  const filterPayment = typeof searchParams.payment === 'string' ? searchParams.payment : '';
  const filterBlocked = typeof searchParams.blocked === 'string' ? searchParams.blocked : '';

  const whereClause: any = {
    stage: {
      notIn: ["Entregado", "Post-Sale Follow-Up Pending (5 days)", "Post-Sale Follow-Up Pending (1 month)", "Cycle Closed"]
    }
  };

  if (filterStage) whereClause.stage = filterStage;
  if (filterDelivery) whereClause.deliveryMethod = filterDelivery;
  if (filterPayment) whereClause.paymentStatus = filterPayment;
  if (q) {
    whereClause.quotation = {
      OR: [
        { folio: { contains: q } },
        { clientNameOrUsername: { contains: q } }
      ]
    };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      quotation: {
        include: {
          salesAssociate: true
        }
      },
      stageHistory: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  function getBlockedStatus(order: any) {
    if (order.stage === "Por confirmar diseño final" && (!order.posTicketNumber || order.posTicketNumber.trim() === "")) {
      return "Falta ticket POS";
    }
    if (order.stage === "Certificación" && order.isCertificatePending) {
      return "Esperando certificado";
    }
    if (order.stage === "Revisión final de asesora" && order.paymentStatus !== "Liquidado") {
      return "Falta liquidar";
    }
    if (order.stage === "Listo para entrega") {
      return "Lista para entregar en tienda";
    }
    if (order.stage === "Preparando envío") {
      return "Lista para preparar envío";
    }
    if (order.stage === "En tránsito") {
      return "Rastrear entrega";
    }
    return "En proceso";
  }

  function getDaysInStage(order: any) {
    if (!order.stageHistory || order.stageHistory.length === 0) return 0;

    const currentStageHistory = order.stageHistory.find((h: any) => h.stage === order.stage);
    if (!currentStageHistory) return 0;

    const start = new Date(currentStageHistory.createdAt).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }

  let processedOrders = orders.map(order => ({
    ...order,
    blockedStatus: getBlockedStatus(order),
    daysInStage: getDaysInStage(order)
  }));

  if (filterBlocked === 'blocked') {
    processedOrders = processedOrders.filter(o => o.blockedStatus.startsWith('Falta') || o.blockedStatus.startsWith('Esperando'));
  } else if (filterBlocked === 'unblocked') {
    processedOrders = processedOrders.filter(o => !(o.blockedStatus.startsWith('Falta') || o.blockedStatus.startsWith('Esperando')));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">Órdenes Activas</h2>
          <p className="text-sm text-[#8E8D8A] mt-1">Vista operativa de órdenes en curso</p>
        </div>
      </div>

      <form method="GET" className="bg-white p-4 border border-[#D8D3CC] rounded-lg shadow-sm flex flex-wrap gap-4 items-end mb-6">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="block text-xs font-medium text-[#8E8D8A] mb-1">Buscar</label>
          <input
            type="text"
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Folio o Cliente..."
            className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]"
          />
        </div>
        <div className="w-40">
          <label htmlFor="stage" className="block text-xs font-medium text-[#8E8D8A] mb-1">Etapa</label>
          <select id="stage" name="stage" defaultValue={filterStage} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todas</option>
            <option value="Por confirmar diseño final">Por confirmar diseño final</option>
            <option value="Producción">Producción</option>
            <option value="Certificación">Certificación</option>
            <option value="Revisión final de asesora">Revisión final de asesora</option>
            <option value="Preparando envío">Preparando envío</option>
            <option value="Listo para entrega">Listo para entrega</option>
            <option value="En tránsito">En tránsito</option>
          </select>
        </div>
        <div className="w-32">
          <label htmlFor="delivery" className="block text-xs font-medium text-[#8E8D8A] mb-1">Entrega</label>
          <select id="delivery" name="delivery" defaultValue={filterDelivery} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todas</option>
            <option value="Store Pickup">Tienda</option>
            <option value="Shipping">Envío</option>
          </select>
        </div>
        <div className="w-32">
          <label htmlFor="payment" className="block text-xs font-medium text-[#8E8D8A] mb-1">Pago</label>
          <select id="payment" name="payment" defaultValue={filterPayment} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todos</option>
            <option value="Liquidado">Liquidado</option>
            <option value="Parcial">Parcial</option>
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="blocked" className="block text-xs font-medium text-[#8E8D8A] mb-1">Estado</label>
          <select id="blocked" name="blocked" defaultValue={filterBlocked} className="w-full text-sm border border-[#D8D3CC] rounded px-3 py-2 bg-[#F5F2EE] focus:outline-none focus:border-[#C5B358]">
            <option value="">Todos</option>
            <option value="blocked">Bloqueado</option>
            <option value="unblocked">En proceso</option>
          </select>
        </div>
        <div>
          <button type="submit" className="bg-[#333333] text-white px-4 py-2 rounded text-sm hover:bg-[#1A1A1A] transition-colors h-[38px]">
            Filtrar
          </button>
        </div>
        {(q || filterStage || filterDelivery || filterPayment || filterBlocked) && (
          <div>
            <Link href="/ordenes/activas" className="text-sm text-[#8E8D8A] hover:text-[#333333] underline px-2 py-2 inline-block h-[38px] leading-[22px]">
              Limpiar
            </Link>
          </div>
        )}
      </form>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F5F2EE] text-[#8E8D8A] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Folio</th>
              <th className="px-6 py-4 font-medium">Cliente / Asesora</th>
              <th className="px-6 py-4 font-medium">Etapa actual</th>
              <th className="px-6 py-4 font-medium">Días en etapa</th>
              <th className="px-6 py-4 font-medium">Entrega</th>
              <th className="px-6 py-4 font-medium">Pago</th>
              <th className="px-6 py-4 font-medium">Bloqueo / Siguiente acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {processedOrders.map(o => (
              <tr key={o.id} className="hover:bg-[#F5F2EE]/50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/ordenes/${o.id}`} className="font-semibold text-[#333333] hover:text-[#C5B358] transition-colors">
                    {o.quotation.folio || o.quotation.id.split('-')[0] + '..'}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[#333333] font-medium">{o.quotation.clientNameOrUsername}</div>
                  <div className="text-xs text-[#8E8D8A]">{o.quotation.salesAssociate.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-[#F5F2EE] text-[#8E8D8A] rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block">
                    {translateStage(o.stage)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${o.daysInStage > 5 ? 'text-red-500' : 'text-[#333333]'}`}>
                    {o.daysInStage}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#333333]">
                  {o.deliveryMethod === 'Store Pickup' ? 'Tienda' : 'Envío'}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] px-2 py-1 rounded border ${o.paymentStatus === 'Liquidado' ? 'text-green-600 bg-green-50 border-green-200' : 'text-yellow-600 bg-yellow-50 border-yellow-200'}`}>
                    {o.paymentStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium ${o.blockedStatus.startsWith('Falta') || o.blockedStatus.startsWith('Esperando') ? 'text-red-600' : 'text-[#C5B358]'}`}>
                    {o.blockedStatus}
                  </span>
                </td>
              </tr>
            ))}

            {processedOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#8E8D8A]">
                  No hay órdenes activas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
