import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { translatePieceType } from "@/lib/translations";
import StatusSelect from "./status-select";

export const dynamic = "force-dynamic";

export default async function DetailCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id: p.id },
    include: { salesAssociate: true, stones: true }
  });

  if (!quotation) {
    notFound();
  }

  const daysRemaining = Math.ceil((new Date(quotation.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif text-[#333333]">Detalle de Cotización</h2>
        <Link href="/cotizaciones/historial" className="text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors border-b border-[#D8D3CC] hover:border-[#333333] pb-0.5">
          ← Volver al Historial
        </Link>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        {/* Encabezado */}
        <div className="bg-[#F5F2EE] p-6 border-b border-[#D8D3CC] flex justify-between items-start">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#8E8D8A] font-semibold mb-1">Folio</div>
            <div className="text-xl font-medium text-[#333333]">{quotation.folio || quotation.id}</div>
          </div>
          <div className="text-right">
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                quotation.status === 'Pendiente de respuesta' ? 'bg-gray-100 text-gray-600' :
                quotation.status === 'En seguimiento' ? 'bg-blue-50 text-blue-600' :
                quotation.status === 'Oportunidad de cierre' ? 'bg-indigo-50 text-indigo-600' :
                quotation.status === 'Declinada' ? 'bg-red-50 text-red-600' :
                quotation.status === 'Converted' ? 'bg-green-50 text-green-600' :
                quotation.status === 'Expired' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {quotation.status}
              </span>

              {quotation.status !== 'Converted' && (
                <div className="mt-1">
                  <StatusSelect id={quotation.id} currentStatus={quotation.status} />
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-[#8E8D8A]">
              Creada el: {new Date(quotation.quotationDate).toLocaleDateString('es-MX')}
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
                <div className="text-[#8E8D8A]">Canal de Venta:</div>
                <div className="font-medium text-[#333333]">{quotation.salesChannel}</div>
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
              </div>
            </div>

            {quotation.notes && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Notas Adicionales</h3>
                <p className="text-sm text-[#333333] whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
          </div>

          {/* Columna Derecha: Piedras y Desglose Financiero */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Piedras Seleccionadas</h3>
              {quotation.stones.length > 0 ? (
                <div className="space-y-3">
                  {quotation.stones.map((s, idx) => (
                    <div key={idx} className="bg-[#F5F2EE]/50 p-3 rounded border border-[#D8D3CC] text-sm flex justify-between">
                      <div>
                        <div className="font-medium text-[#333333]">{s.lotCode} - {s.stoneName}</div>
                        <div className="text-xs text-[#8E8D8A] mt-0.5">{s.weightCt}ct a ${s.pricePerCt.toLocaleString()}/ct</div>
                      </div>
                      <div className="font-medium text-[#333333] text-right">
                        ${s.stoneSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#8E8D8A] italic">No se incluyeron piedras adicionales.</div>
              )}
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold border-b border-[#F5F2EE] pb-2 mb-3">Desglose Financiero</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8E8D8A]">Precio Base Modelo:</span>
                  <span className="text-[#333333]">${quotation.modelBasePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E8D8A]">Total Piedras:</span>
                  <span className="text-[#333333]">${quotation.totalStonesPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-dashed border-[#D8D3CC] pt-2 flex justify-between">
                  <span className="text-[#8E8D8A]">Subtotal:</span>
                  <span className="text-[#333333]">${quotation.subtotalBeforeAdjustments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>

                {quotation.msInternalAdjustment > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8E8D8A]">Ajuste MS (+):</span>
                    <span className="text-[#333333]">${quotation.msInternalAdjustment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {quotation.marginProtectionAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8E8D8A]">Protección Margen (+):</span>
                    <span className="text-[#333333]">${quotation.marginProtectionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {quotation.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8E8D8A]">Descuento Aplicado:</span>
                    <span className="text-red-600 font-medium">-{quotation.discountPercent}%</span>
                  </div>
                )}

                <div className="border-t border-[#D8D3CC] pt-3 mt-3 flex justify-between items-center">
                  <span className="font-semibold text-[#333333]">Precio Final Cliente:</span>
                  <div className="text-right">
                    {quotation.discountPercent > 0 && (
                      <div className="text-sm text-[#8E8D8A] line-through mb-1">
                        ${(quotation.discountPercent === 100 ? (quotation.subtotalBeforeAdjustments + quotation.msInternalAdjustment + quotation.marginProtectionAmount) : (quotation.finalClientPrice / (1 - quotation.discountPercent / 100))).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <span className="font-serif text-lg text-[#C5B358] font-bold">${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-[#8E8D8A] uppercase mt-1">
                  Válido hasta: <span className={isExpired ? 'text-red-500 font-semibold' : ''}>{quotation.validUntil.toLocaleDateString('es-MX')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="bg-[#F5F2EE] p-4 border-t border-[#D8D3CC] flex justify-end gap-4">
           <Link href={`/cotizaciones/${quotation.id}/cliente`} target="_blank" className="bg-white border border-[#D8D3CC] text-[#333333] px-6 py-2 rounded text-sm font-semibold hover:bg-[#F5F2EE] transition-colors uppercase tracking-wider">
             Ver Vista Cliente
           </Link>
           {quotation.status !== 'Converted' && (
             <Link href={`/ordenes/nueva?quotationId=${quotation.id}`} className="bg-[#333333] text-white px-6 py-2 rounded text-sm font-semibold hover:bg-black transition-colors uppercase tracking-wider">
               Convertir a Orden
             </Link>
           )}
        </div>
      </div>
    </div>
  );
}
