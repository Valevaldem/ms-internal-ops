"use client";

import { startTransition } from "react";
import { updateStatus } from "./actions";

export default function StatusSelect({ id, currentStatus }: { id: string, currentStatus: string }) {
  return (
    <select
      name="status"
      defaultValue={currentStatus}
      onChange={(e) => {
        const newStatus = e.target.value;
        startTransition(() => {
          updateStatus(id, newStatus);
        });
      }}
      className="text-xs border border-[#D8D3CC] rounded p-1 bg-white focus:outline-none focus:border-[#C5B358] text-[#333333]"
    >
      <option value="Pendiente de respuesta">Pendiente de respuesta</option>
      <option value="En seguimiento">En seguimiento</option>
      <option value="Oportunidad de cierre">Oportunidad de cierre</option>
      <option value="Declinada">Declinada</option>
    </select>
  );
}