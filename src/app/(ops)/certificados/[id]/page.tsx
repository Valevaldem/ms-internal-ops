import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export default async function CertificatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser();
  verifyAccess(user, ['manager', 'advisor', 'certificate_operator'], "/");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      quotation: {
        include: {
          salesAssociate: true,
          stones: true,
        },
      },
      certificateMembers: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Calculate grouped stones total
  const groupedStones: Record<string, number> = {};
  order.quotation.stones.forEach((stone) => {
    if (!groupedStones[stone.stoneName]) {
      groupedStones[stone.stoneName] = 0;
    }
    groupedStones[stone.stoneName] += stone.weightCt;
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/certificados"
          className="flex items-center text-[#8E8D8A] hover:text-[#333333] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver a Certificados
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-[#333333]">
            Vista Previa del Certificado
          </h2>
          <p className="text-sm text-[#8E8D8A] mt-1">
            {order.quotation.folio || order.quotation.id}
          </p>
        </div>
        <Link
          href={`/ordenes/${order.id}`}
          className="text-sm border border-[#D8D3CC] text-[#333333] px-4 py-2 rounded hover:bg-[#F5F2EE] transition-colors"
        >
          Ver Orden Completa
        </Link>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg shadow-sm overflow-hidden">
        {/* Basic Header Info */}
        <div className="p-6 bg-[#F5F2EE] border-b border-[#D8D3CC] grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
              Cliente
            </div>
            <div className="text-sm font-medium text-[#333333]">
              {order.quotation.clientNameOrUsername}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
              Asesora
            </div>
            <div className="text-sm font-medium text-[#333333]">
              {order.quotation.salesAssociate.name}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
              Modelo
            </div>
            <div className="text-sm font-medium text-[#333333]">
              {order.quotation.modelName}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
              Pieza
            </div>
            <div className="text-sm font-medium text-[#333333]">
              {order.quotation.pieceType}
            </div>
          </div>
        </div>

        {/* Certificate Specific Info */}
        <div className="p-6 space-y-6">
          {order.isCertificatePending ? (
            <div className="bg-red-50 text-red-700 p-4 rounded border border-red-200">
              <span className="font-semibold block mb-1">
                Certificado Pendiente de Confirmación
              </span>
              Los datos finales del certificado aún no han sido definidos por el
              cliente.
            </div>
          ) : (
            <>
              <div>
                <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
                  Título del Certificado
                </div>
                <div className="text-lg font-serif text-[#333333]">
                  {order.certificateTitle || (
                    <span className="text-red-500 italic">No especificado</span>
                  )}
                </div>
              </div>

              {order.certificateNotes && (
                <div>
                  <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
                    Notas Especiales
                  </div>
                  <div className="text-sm text-[#333333] bg-yellow-50 p-3 rounded border border-yellow-200 italic">
                    {order.certificateNotes}
                  </div>
                </div>
              )}

              {/* Stones and Members */}
              {order.quotation.stones.length > 0 && (
                <div>
                  <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-3">
                    Asignación de Piedras
                  </div>
                  <div className="bg-[#F9F8F6] rounded border border-[#E8E6E1] divide-y divide-[#E8E6E1]">
                    {order.quotation.stones.map((stone) => {
                      const member = order.certificateMembers.find(
                        (m) => m.representativeStone === stone.lotCode
                      );
                      return (
                        <div
                          key={stone.id}
                          className="px-4 py-3 text-sm text-[#333333] flex flex-wrap gap-2 items-center"
                        >
                          <span className="font-semibold w-16 text-right">
                            {stone.weightCt.toFixed(2)} ct
                          </span>
                          <span className="text-[#D8D3CC]">|</span>
                          <span className="w-32 font-medium">
                            {stone.lotCode} - {stone.stoneName}
                          </span>
                          <span className="text-[#D8D3CC]">|</span>
                          {member?.helperDescription ? (
                            <>
                              <span className="italic text-[#8E8D8A]">
                                {member.helperDescription}
                              </span>
                              <span className="text-[#D8D3CC]">|</span>
                            </>
                          ) : null}
                          <span className="font-medium text-[#C5B358]">
                            {member?.memberName || (
                              <span className="text-red-400 italic">
                                Sin asignar
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              {Object.keys(groupedStones).length > 0 && (
                <div>
                  <div className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-2">
                    Resumen Total
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {Object.entries(groupedStones).map(([name, total]) => (
                      <div
                        key={name}
                        className="bg-white border border-[#D8D3CC] px-3 py-1.5 rounded-full text-sm font-medium text-[#333333]"
                      >
                        {name} ({total.toFixed(2)} CT)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
