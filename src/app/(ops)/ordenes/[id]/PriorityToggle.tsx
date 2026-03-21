"use client";

import { togglePriority } from "./actions";
import { useTransition } from "react";
import { Star } from "lucide-react";

export default function PriorityToggle({ orderId, isPriority }: { orderId: string, isPriority: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => togglePriority(orderId, isPriority))}
      disabled={isPending}
      className={`p-1 rounded-full transition-colors ${isPriority ? 'text-red-500 hover:text-red-600' : 'text-[#8E8D8A] hover:text-[#333333]'}`}
      title={isPriority ? "Quitar prioridad" : "Marcar como prioritaria"}
    >
      <Star size={20} className={isPriority ? "fill-current" : ""} />
    </button>
  );
}