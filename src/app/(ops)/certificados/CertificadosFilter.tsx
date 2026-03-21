"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function CertificadosFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter") || "all";

  const setFilter = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("filter");
      } else {
        params.set("filter", value);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const filters = [
    { value: "all", label: "Todos" },
    { value: "review", label: "Requiere Revisión" },
    { value: "missing_vinyl", label: "Falta Vinil/Título" },
    { value: "missing_printed", label: "Falta Info Impresa" },
    { value: "missing_photo", label: "Falta Foto" },
    { value: "ready", label: "Listos para finalizar" },
  ];

  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => setFilter(f.value)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors border ${
            currentFilter === f.value
              ? "bg-[#C5B358] text-white border-[#C5B358]"
              : "bg-white text-[#8E8D8A] border-[#D8D3CC] hover:bg-[#F5F2EE]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
