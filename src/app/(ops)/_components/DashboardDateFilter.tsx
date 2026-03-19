"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const handleDateChange = (field: "startDate" | "endDate" | "compareStartDate" | "compareEndDate", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(field, value);
    } else {
      params.delete(field);
    }
    router.push(`/?${params.toString()}`);
  };

  const compareStartDate = searchParams.get("compareStartDate") || "";
  const compareEndDate = searchParams.get("compareEndDate") || "";
  const isComparing = searchParams.has("compareStartDate") && searchParams.has("compareEndDate");

  const toggleComparison = (enabled: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (enabled) {
      // Default to the previous month roughly if no dates selected yet
      const today = new Date();
      const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      params.set("compareStartDate", firstDayPrevMonth.toLocaleDateString('en-CA'));
      params.set("compareEndDate", lastDayPrevMonth.toLocaleDateString('en-CA'));
    } else {
      params.delete("compareStartDate");
      params.delete("compareEndDate");
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2">
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
        <div className="flex items-center ml-2 border-l border-[#D8D3CC] pl-4 h-full">
          <label className="flex items-center cursor-pointer gap-2">
            <input
              type="checkbox"
              checked={isComparing}
              onChange={(e) => toggleComparison(e.target.checked)}
              className="w-4 h-4 text-[#C5B358] border-[#D8D3CC] rounded focus:ring-[#C5B358]"
            />
            <span className="text-sm font-medium text-[#333333]">Comparar</span>
          </label>
        </div>
      </div>

      {isComparing && (
        <div className="flex items-center gap-4 bg-[#F5F2EE] border border-[#D8D3CC] p-4 rounded-lg shadow-sm ml-auto">
          <span className="text-xs font-medium text-[#8E8D8A] uppercase tracking-wider mr-2">
            Periodo de Comparación:
          </span>
          <div className="flex flex-col">
            <input
              type="date"
              id="compareStartDate"
              value={compareStartDate}
              onChange={(e) => handleDateChange("compareStartDate", e.target.value)}
              className="px-3 py-1 border border-[#D8D3CC] rounded-md text-sm text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358]"
            />
          </div>
          <span className="text-[#8E8D8A] text-sm">-</span>
          <div className="flex flex-col">
            <input
              type="date"
              id="compareEndDate"
              value={compareEndDate}
              onChange={(e) => handleDateChange("compareEndDate", e.target.value)}
              className="px-3 py-1 border border-[#D8D3CC] rounded-md text-sm text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#C5B358] focus:border-[#C5B358]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
