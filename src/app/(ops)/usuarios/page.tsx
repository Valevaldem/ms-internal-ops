import prisma from "@/lib/prisma";
import { getCurrentUser, verifyAccess } from "@/lib/auth";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";

export const metadata = {
  title: "Usuarios | Maria Salinas",
};

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  verifyAccess(user, ["manager"]);

  const users = await prisma.user.findMany({
    include: {
      salesAssociate: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-medium text-[#333333] tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
            Usuarios del Sistema
          </h1>
          <p className="text-sm text-[#8E8D8A] mt-1">
            Administra los accesos internos al sistema.
          </p>
        </div>
        <Link
          href="/usuarios/nuevo"
          className="flex items-center gap-2 bg-[#333333] text-white px-4 py-2 rounded text-sm hover:bg-[#222222] transition-colors"
        >
          <Plus size={16} />
          Nuevo Usuario
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#D8D3CC]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[#8E8D8A] uppercase bg-[#F5F2EE] border-b border-[#D8D3CC]">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Vínculo Asesora</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D3CC]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#F9F8F6] transition-colors">
                <td className="px-4 py-3 font-medium text-[#333333]">{u.name}</td>
                <td className="px-4 py-3 text-[#555555]">{u.username}</td>
                <td className="px-4 py-3 text-[#555555] capitalize">
                  {u.role === "manager" ? "Manager" : u.role === "certificate_operator" ? "Certificados" : "Asesora"}
                </td>
                <td className="px-4 py-3 text-[#555555]">
                  {u.salesAssociate ? u.salesAssociate.name : <span className="text-[#8E8D8A] italic">N/A</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.activeStatus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {u.activeStatus ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/usuarios/${u.id}`}
                    className="inline-flex items-center gap-1 text-sm text-[#8E8D8A] hover:text-[#333333] transition-colors"
                  >
                    <Edit2 size={14} /> Editar
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#8E8D8A]">
                  No se encontraron usuarios en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
