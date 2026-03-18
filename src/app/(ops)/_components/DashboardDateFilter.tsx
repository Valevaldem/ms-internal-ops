"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(field, value);
    } else {
      params.delete(field);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4 bg-white border border-[#D8D3CC] p-4 rounded-lg shadow-sm">
      <div className="flex flex-col">
        <label htmlFor="startDate" className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
          Fecha de Inicio
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => handleDateChange("startDate", e.target.value)}
          className="px-3 py-2 border border-[#D8D3CC] rounded-md text-sm text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358]"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="endDate" className="text-xs text-[#8E8D8A] uppercase tracking-wider mb-1">
          Fecha de Fin
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => handleDateChange("endDate", e.target.value)}
          className="px-3 py-2 border border-[#D8D3CC] rounded-md text-sm text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358]"
        />
      </div>
    </div>
  );
}
