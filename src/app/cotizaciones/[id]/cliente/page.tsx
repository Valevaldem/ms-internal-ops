import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="min-h-screen bg-[#F5F2EE] flex items-center justify-center p-6 font-sans">
      <div className="bg-white max-w-3xl w-full shadow-lg border border-[#D8D3CC] p-10 md:p-16">

        {/* Header - Brand Presentation */}
        <div className="text-center mb-12 border-b border-[#D8D3CC] pb-10">
          <h1 className="text-3xl font-serif text-[#333333] tracking-widest uppercase mb-2">Maria Salinas</h1>
          <p className="text-xs text-[#8E8D8A] tracking-[0.2em] uppercase">Propuesta de Diseño</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">

          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-2">Preparado para</h3>
              <p className="text-lg font-serif text-[#333333]">{quotation.clientNameOrUsername}</p>
            </div>

            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-2">Asesor</h3>
              <p className="text-sm text-[#333333]">{quotation.salesAssociate.name}</p>
            </div>

            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-2">Folio de Referencia</h3>
              <p className="text-sm text-[#333333]">{quotation.folio || quotation.id.split('-')[0]}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-2">Detalle de la Pieza</h3>
              <p className="text-sm text-[#333333]"><span className="text-[#8E8D8A] mr-2">Tipo:</span>{quotation.pieceType}</p>
              <p className="text-sm text-[#333333] mt-1"><span className="text-[#8E8D8A] mr-2">Diseño:</span>{quotation.modelName}</p>
            </div>

            {quotation.stones.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-2">Gemas Incluidas</h3>
                <ul className="text-sm text-[#333333] space-y-1">
                  {quotation.stones.map((s, idx) => (
                    <li key={idx} className="flex items-center before:content-[''] before:w-1 before:h-1 before:bg-[#C5B358] before:rounded-full before:mr-2">
                      {s.stoneName} ({s.weightCt} ct)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Validity */}
        <div className="border-t border-[#D8D3CC] pt-8 flex flex-col md:flex-row justify-between items-end md:items-center">
          <div className="mb-6 md:mb-0">
             <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-1">Inversión Estimada</h3>
             <p className="text-3xl font-serif text-[#C5B358]">${quotation.finalClientPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-sm text-[#8E8D8A]">MXN</span></p>
          </div>

          <div className="text-right">
             <h3 className="text-[10px] uppercase tracking-widest text-[#8E8D8A] font-semibold mb-1">Vigencia</h3>
             <p className={`text-sm ${isExpired ? 'text-red-500 line-through' : 'text-[#333333]'}`}>
               {quotation.validUntil.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
             </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
           <p className="text-[10px] text-[#8E8D8A] uppercase tracking-wider">
             Precios sujetos a cambio sin previo aviso posterior a la fecha de vigencia. <br/>
             Consulte a su asesor para opciones de personalización.
           </p>
        </div>

      </div>
    </div>
  );
}
