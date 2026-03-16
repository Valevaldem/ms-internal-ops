import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { translateStage, translatePieceType } from "@/lib/translations";
import CertificateEditForm from "./CertificateEditForm";

export const dynamic = "force-dynamic";

export default async function DetailOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const order = await prisma.order.findUnique({
    where: { id: p.id },
    include: {
      quotation: {
        include: { salesAssociate: true, stones: true }
      },
      certificateMembers: true
    }
  });

  if (!order) {
    notFound();
  }

  const { quotation } = order;

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif text-[#333333]">Detalle de Orden</h2>
        <Link href="/ordenes/produccion" className="text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors border-b border-[#D8D3CC] hover:border-[#333333] pb-0.5">
          ← Volver a Producción / Historial
        </Link>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        {/* Encabezado */}
        <div className="bg-[#F5F2EE] p-6 border-b border-[#D8D3CC] flex justify-between items-start">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold mb-1">Folio (Orden)</div>
            <div className="text-xl font-medium text-[#333333]">{quotation.folio || quotation.id}</div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
              order.stage === 'Cycle Closed' ? 'bg-gray-100 text-gray-500' :
              order.stage === 'In Production' ? 'bg-[#C5B358]/20 text-[#8E7E3D]' :
              'bg-blue-50 text-blue-600'
            }`}>
              {translateStage(order.stage)}
            </span>
            <div className="mt-2 text-xs text-[#8E8D8A]">
              Creada el: {new Date(order.createdAt).toLocaleDateString('es-MX')}
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna Izquierda: Datos del Cliente y Pieza */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Datos del Cliente</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-[#8E8D8A]">Nombre / Usuario:</div>
                <div className="font-medium text-[#333333]">{quotation.clientNameOrUsername}</div>
                <div className="text-[#8E8D8A]">Teléfono:</div>
                <div className="font-medium text-[#333333]">{quotation.phoneNumber || 'No proporcionado'}</div>
                <div className="text-[#8E8D8A]">Asesor:</div>
                <div className="font-medium text-[#333333]">{quotation.salesAssociate.name}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Detalle de la Pieza</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-[#8E8D8A]">Tipo de Pieza:</div>
                <div className="font-medium text-[#333333]">{translatePieceType(quotation.pieceType)}</div>
                <div className="text-[#8E8D8A]">Modelo:</div>
                <div className="font-medium text-[#333333]">{quotation.modelName}</div>
                <div className="text-[#8E8D8A]">Entrega:</div>
                <div className="font-medium text-[#333333]">{order.deliveryMethod === 'Store Pickup' ? 'Recolección en Tienda' : 'Envío por Paquetería'}</div>
              </div>
            </div>

            {quotation.notes && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Notas de Cotización</h3>
                <p className="text-sm text-[#333333] whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}

            {order.orderNotes && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3 mt-6">Notas de Orden</h3>
                <p className="text-sm text-[#333333] whitespace-pre-wrap">{order.orderNotes}</p>
              </div>
            )}

            <CertificateEditForm
              orderId={order.id}
              isCertificatePending={order.isCertificatePending}
              certificateTitle={order.certificateTitle}
              certificateMembers={order.certificateMembers}
              quotationStones={quotation.stones}
            />
          </div>

          {/* Columna Derecha: Piedras y Total */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Piedras Seleccionadas</h3>
              {quotation.stones.length > 0 ? (
                <div className="space-y-3">
                  {quotation.stones.map((s, idx) => (
                    <div key={idx} className="bg-[#F5F2EE]/50 p-3 rounded border border-[#D8D3CC] text-sm flex justify-between">
                      <div>
                        <div className="font-medium text-[#333333]">{s.lotCode} - {s.stoneName}</div>
                        <div className="text-xs text-[#8E8D8A] mt-0.5">{s.weightCt}ct</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#8E8D8A] italic">No se incluyeron piedras adicionales.</div>
              )}
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Total Financiero</h3>
              <div className="space-y-2 text-sm">
                <div className="border-[#D8D3CC] pt-3 flex justify-between items-center">
                  <span className="font-semibold text-[#333333]">Precio Final Cobrado:</span>
                  <span className="font-serif text-lg text-[#C5B358] font-bold">${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {(order.referenceImageUrl || order.posTicketNumber) && (
               <div>
                  <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Información Adicional</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    {order.referenceImageUrl && (
                      <>
                        <div className="text-[#8E8D8A]">URL Referencia:</div>
                        <div className="font-medium text-[#333333]">
                           <a href={order.referenceImageUrl} target="_blank" rel="noopener noreferrer" className="text-[#C5B358] hover:underline truncate block">Ver Imagen</a>
                        </div>
                      </>
                    )}
                    {order.posTicketNumber && (
                      <>
                        <div className="text-[#8E8D8A]">Ticket POS:</div>
                        <div className="font-medium text-[#333333]">{order.posTicketNumber}</div>
                      </>
                    )}
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
