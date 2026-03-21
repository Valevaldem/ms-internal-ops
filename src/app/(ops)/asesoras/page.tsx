import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2, ShieldAlert } from "lucide-react";
import { getCurrentUser, verifyAccess } from "@/lib/auth";

export default async function AsesorasListPage() {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const asesoras = await prisma.salesAssociate.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { quotations: true, users: true },
      },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-medium text-[#333333] tracking-wide mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
            Asesoras de Ventas
          </h1>
          <p className="text-[#8E8D8A] text-sm">
            Gestión de perfiles comerciales (asociables a usuarios).
          </p>
        </div>
        <Link
          href="/asesoras/nueva"
          className="bg-[#333333] text-white px-6 py-2.5 rounded text-sm hover:bg-[#222222] transition-colors flex items-center gap-2 uppercase tracking-wider font-medium"
        >
          <Plus size={16} /> Nueva Asesora
        </Link>
      </div>

      <div className="bg-white rounded-md border border-[#D8D3CC] overflow-hidden">
        <table className="w-full text-left text-sm text-[#333333]">
          <thead className="bg-[#F5F2EE] border-b border-[#D8D3CC] text-[#8E8D8A] uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre de Asesora</th>
              <th className="px-6 py-4 font-semibold text-center">Estado</th>
              <th className="px-6 py-4 font-semibold text-center">Ajuste MS</th>
              <th className="px-6 py-4 font-semibold text-center">Usuarios Vinculados</th>
              <th className="px-6 py-4 font-semibold text-center">Cotizaciones</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE5DF]">
            {asesoras.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#8E8D8A]">
                  No hay asesoras registradas.
                </td>
              </tr>
            ) : (
              asesoras.map((asesora) => (
                <tr key={asesora.id} className="hover:bg-[#FDFBF9] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[#333333]">{asesora.name}</div>
                    <div className="text-xs text-[#8E8D8A] mt-0.5" title={asesora.id}>ID: {asesora.id.slice(-8)}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                        asesora.activeStatus
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {asesora.activeStatus ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {asesora.appliesMsAdjustment ? (
                      <span className="inline-flex items-center justify-center bg-[#C5B358]/10 text-[#C5B358] w-6 h-6 rounded-full" title="Aplica ajuste MS">
                        <ShieldAlert size={14} />
                      </span>
                    ) : (
                      <span className="text-[#8E8D8A]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-[#8E8D8A]">
                    {asesora._count.users}
                  </td>
                  <td className="px-6 py-4 text-center text-[#8E8D8A]">
                    {asesora._count.quotations}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/asesoras/${asesora.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[#C5B358] hover:text-[#333333] font-medium transition-colors border border-transparent hover:border-[#333333] px-2 py-1 rounded"
                    >
                      <Edit2 size={12} /> Editar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
