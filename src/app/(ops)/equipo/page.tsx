import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess, getRoleLabel } from "@/lib/auth";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager", "designer"]);

  const members = await prisma.user.findMany({
    include: { salesAssociate: true },
    orderBy: { name: "asc" },
  });

  const roleColors: Record<string, string> = {
    manager: "bg-blue-50 text-blue-700 border-blue-200",
    designer: "bg-purple-50 text-purple-700 border-purple-200",
    advisor: "bg-[#F5F2EE] text-[#555555] border-[#D8D3CC]",
    stock_operator: "bg-orange-50 text-orange-700 border-orange-200",
    certificate_operator: "bg-green-50 text-green-700 border-green-200",
    viewer: "bg-gray-50 text-gray-500 border-gray-200",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-medium text-[#333333] tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
            Equipo
          </h1>
          <p className="text-sm text-[#8E8D8A] mt-1">Gestiona los accesos y perfiles del equipo interno.</p>
        </div>
        <Link href="/equipo/nuevo" className="flex items-center gap-2 bg-[#333333] text-white px-4 py-2 rounded text-sm hover:bg-[#222222] transition-colors">
          <Plus size={16} /> Nueva Persona
        </Link>
      </div>

      <div className="bg-white border border-[#D8D3CC] rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[#8E8D8A] uppercase bg-[#F5F2EE] border-b border-[#D8D3CC]">
            <tr>
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Usuario</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Perfil vinculado</th>
              <th className="px-5 py-3 font-medium">Ajuste MS</th>
              <th className="px-5 py-3 font-medium text-center">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EE]">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-[#F9F8F6] transition-colors">
                <td className="px-5 py-3 font-medium text-[#333333]">{m.name}</td>
                <td className="px-5 py-3 text-[#555555] font-mono text-xs">{m.username}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[m.role] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {getRoleLabel(m.role)}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#555555]">
                  {m.salesAssociate
                    ? <span className={m.salesAssociate.name.startsWith("[STOCK]") ? "text-[#8E8D8A] text-xs italic" : ""}>{m.salesAssociate.name.replace("[STOCK] ", "")}</span>
                    : <span className="text-[#8E8D8A] italic text-xs">—</span>}
                </td>
                <td className="px-5 py-3">
                  {m.salesAssociate?.appliesMsAdjustment
                    ? <span className="text-xs text-[#C5B358] font-semibold">✓ Sí</span>
                    : <span className="text-xs text-[#8E8D8A]">—</span>}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.activeStatus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {m.activeStatus ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/equipo/${m.id}`} className="inline-flex items-center gap-1 text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors">
                    <Edit2 size={14} /> Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
