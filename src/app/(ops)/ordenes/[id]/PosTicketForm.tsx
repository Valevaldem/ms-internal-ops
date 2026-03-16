"use client";

import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";

export default function PosTicketForm({ orderId, currentTicket, updateAction }: { orderId: string, currentTicket: string | null, updateAction: (formData: FormData) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    await updateAction(formData);
    setIsPending(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-1">
        <input type="hidden" name="id" value={orderId} />
        <div className="flex gap-2">
           <input
             type="text"
             name="posTicketNumber"
             defaultValue={currentTicket || ""}
             placeholder="Ingresa Ticket POS"
             required
             className="border border-[#D8D3CC] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#C5B358] w-full"
           />
        </div>
        <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="flex items-center gap-1 text-xs bg-[#333333] text-white px-2 py-1 rounded disabled:opacity-50">
                <Check size={12} /> {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={isPending} className="flex items-center gap-1 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded disabled:opacity-50">
                <X size={12} /> Cancelar
            </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-between items-center group">
       <span className="font-medium text-[#333333]">
           {currentTicket ? currentTicket : <span className="text-[#8E8D8A] italic text-xs">Falta ticket POS</span>}
       </span>
       <button onClick={() => setIsEditing(true)} className="text-[#8E8D8A] hover:text-[#C5B358] transition-colors opacity-0 group-hover:opacity-100">
           <Edit2 size={12} />
       </button>
    </div>
  );
}
