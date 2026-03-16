"use client";

import { useState } from "react";
import Link from "next/link";
import { convertToOrderAction } from "../actions";

export default function OrderForm({ quotationId, quotationStones }: { quotationId: string, quotationStones: any[] }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("quotationId", quotationId);

    const isCertificatePending = formData.get("isCertificatePending") === "on";

    // Validate certificate data if not pending
    if (!isCertificatePending) {
      const title = formData.get("certificateTitle");
      if (!title || (title as string).trim() === "") {
        setError("El título del certificado es requerido si no está marcado como pendiente.");
        setIsPending(false);
        return;
      }

      for (let i = 0; i < quotationStones.length; i++) {
        const memberName = formData.get(`member_${i}`);
        if (!memberName || (memberName as string).trim() === "") {
          setError(`Falta el nombre del miembro para la piedra ${quotationStones[i].lotCode}`);
          setIsPending(false);
          return;
        }
      }
    }

    const posTicket = formData.get("posTicketNumber");
    if (!posTicket || (posTicket as string).trim() === "") {
      setError("El Número de Ticket POS es obligatorio.");
      setIsPending(false);
      return;
    }

    try {
      const result = await convertToOrderAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("Ocurrió un error al convertir la orden.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-[#D8D3CC] space-y-5">
      <h3 className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider mb-4 border-b border-[#F5F2EE] pb-2">Datos de la Orden</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-[#333333] mb-1">Método de Entrega</label>
        <select name="deliveryMethod" required className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white">
          <option value="Store Pickup">Recolección en Tienda</option>
          <option value="Shipping">Envío por Paquetería</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-[#333333] mb-1">Número de Ticket POS <span className="text-red-500">*</span></label>
        <input type="text" name="posTicketNumber" required className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
      </div>

      <div>
        <label className="block text-sm text-[#333333] mb-1">Notas de Orden (talla, color de oro, etc.)</label>
        <textarea name="orderNotes" rows={3} className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"></textarea>
      </div>

      <div className="border-t border-[#F5F2EE] pt-4 mt-4">
        <h3 className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider mb-4">Información de Certificado</h3>

        <div className="mb-4">
          <label className="flex items-center text-sm text-[#333333]">
            <input type="checkbox" name="isCertificatePending" className="mr-2" />
            Pendiente de Confirmación (El cliente aún no sabe los datos finales)
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#333333] mb-1">Título del Certificado (ej. Apellidos de la Familia)</label>
            <input type="text" name="certificateTitle" className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]" />
          </div>

          {quotationStones.length > 0 && (
            <div>
              <label className="block text-sm text-[#333333] mb-2 font-medium">Asignación de Piedras (Orden de Izquierda a Derecha)</label>
              <div className="space-y-3">
                {quotationStones.map((stone, i) => (
                  <div key={stone.id} className="bg-[#F5F2EE] p-3 rounded border border-[#D8D3CC] flex flex-col gap-2">
                    <div className="text-xs font-semibold text-[#8E8D8A]">
                      Piedra {i + 1}: {stone.lotCode} ({stone.weightCt}ct)
                      <input type="hidden" name={`stoneId_${i}`} value={stone.id} />
                      <input type="hidden" name={`stoneLot_${i}`} value={stone.lotCode} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input type="text" name={`member_${i}`} placeholder="Nombre del Miembro" className="w-full border border-[#D8D3CC] rounded p-1.5 text-sm focus:outline-none focus:border-[#C5B358]" />
                      </div>
                      <div>
                        <input type="text" name={`helper_${i}`} placeholder="Nota identificadora (ej. rubí más oscuro)" className="w-full border border-[#D8D3CC] rounded p-1.5 text-sm focus:outline-none focus:border-[#C5B358]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[#F5F2EE]">
        <Link href="/cotizaciones/historial" className="px-4 py-2 text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors mr-4">
          Cancelar
        </Link>
        <button type="submit" disabled={isPending} className="bg-[#333333] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2 rounded text-sm uppercase tracking-wider font-semibold transition-colors">
          {isPending ? 'Generando...' : 'Generar Orden'}
        </button>
      </div>
    </form>
  );
}
