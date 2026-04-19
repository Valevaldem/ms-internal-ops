"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`/ordenes/activas?${params.toString()}`);
  };

  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-[#D8D3CC] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#C5B358]"
    >
      <option value="recent">Actualización reciente</option>
      <option value="oldest">Más antiguas</option>
      <option value="createdDesc">Creación reciente</option>
      <option value="production">Inicio de producción</option>
      <option value="client">Cliente (A–Z)</option>
    </select>
  );
}
