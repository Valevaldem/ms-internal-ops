import Link from 'next/link';
import { Home, FileText, ShoppingBag, Bell, Settings, Calculator, List } from 'lucide-react';

export default function OpsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen bg-[#F5F2EE] text-[#333333] font-sans antialiased selection:bg-[#D8D3CC] selection:text-[#333333]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D8D3CC] flex flex-col items-center py-8 px-4 h-full shadow-sm">
          <div className="mb-12">
            <h1 className={`text-xl tracking-widest text-center text-[#333333] uppercase font-medium`} style={{ fontFamily: 'var(--font-poppins)' }}>
              Maria Salinas
            </h1>
            <p className="text-xs text-center text-[#8E8D8A] tracking-wider mt-1">
              Internal Ops
            </p>
          </div>

          <nav className="flex-1 w-full space-y-2">
            <SidebarLink href="/" icon={<Home size={18} />} label="Resumen" />

            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider pl-4">Cotizaciones</p>
            </div>
            <SidebarLink href="/cotizaciones/nueva" icon={<Calculator size={18} />} label="Nueva Cotización" />
            <SidebarLink href="/cotizaciones/historial" icon={<FileText size={18} />} label="Historial" />

            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider pl-4">Órdenes</p>
            </div>
            <SidebarLink href="/ordenes/activas" icon={<List size={18} />} label="Órdenes Activas" />
            <SidebarLink href="/ordenes/produccion" icon={<Settings size={18} />} label="En Producción" />
            <SidebarLink href="/ordenes/historial" icon={<ShoppingBag size={18} />} label="Historial de Órdenes" />

            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider pl-4">Sistema</p>
            </div>
            <SidebarLink href="/alertas" icon={<Bell size={18} />} label="Alertas" />
          </nav>

          <div className="mt-auto w-full border-t border-[#D8D3CC] pt-4 flex flex-col gap-2">
             <div className="text-sm text-[#8E8D8A] flex items-center gap-2 pl-4">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               Staff activo
             </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#F5F2EE]">
          <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-[#D8D3CC] min-h-[80vh] p-8">
            {children}
          </div>
        </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors text-[#333333] hover:bg-[#F5F2EE] hover:text-[#333333]"
    >
      <span className="text-[#8E8D8A]">{icon}</span>
      {label}
    </Link>
  );
}
