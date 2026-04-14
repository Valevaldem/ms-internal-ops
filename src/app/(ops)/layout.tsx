import Link from 'next/link';
import { Home, FileText, ShoppingBag, Bell, Settings, Calculator, Award, User, LogOut, Users, UserPlus, Package, Tag, Menu } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import SidebarDrawer from './_components/SidebarDrawer';

export default async function OpsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  const navItems = buildNavItems(user);

  return (
    <div className="flex h-screen bg-[#F5F2EE] text-[#333333] font-sans antialiased selection:bg-[#D8D3CC] selection:text-[#333333]">

      {/* Sidebar desktop — visible en lg+ */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#D8D3CC] flex-col items-center py-8 px-4 h-full shadow-sm flex-shrink-0">
        <SidebarContent user={user} navItems={navItems} />
      </aside>

      {/* Sidebar móvil/iPad — drawer */}
      <SidebarDrawer user={user} navItems={navItems} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-[#F5F2EE]">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-[#D8D3CC] min-h-[80vh] p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function buildNavItems(user: any) {
  const items: { href: string; icon: string; label: string; section?: string }[] = [];

  if (user.role === 'advisor' || user.role === 'manager') {
    items.push({ href: '/', icon: 'Home', label: 'Resumen' });
    items.push({ href: '/cotizaciones/nueva', icon: 'Calculator', label: 'Nueva Cotización', section: 'Cotizaciones' });
    items.push({ href: '/cotizaciones/historial', icon: 'FileText', label: 'Historial' });
    items.push({ href: '/ordenes/produccion', icon: 'Package', label: 'Órdenes', section: 'Órdenes' });
  }

  if (user.role === 'stock_operator') {
    items.push({ href: '/cotizaciones/stock', icon: 'Tag', label: 'Cotización Stock' });
    items.push({ href: '/cotizaciones/historial', icon: 'FileText', label: 'Mis Cotizaciones' });
  }

  if (user.role === 'manager' || user.role === 'certificate_operator') {
    const section = user.role === 'certificate_operator' ? 'Operación' : undefined;
    items.push({ href: '/certificados', icon: 'Award', label: 'Certificados', section });
  }

  if (user.role === 'advisor' || user.role === 'manager') {
    items.push({ href: '/ordenes/historial', icon: 'ShoppingBag', label: 'Post-venta' });
  }

  if (user.role === 'manager') {
    items.push({ href: '/usuarios', icon: 'Users', label: 'Usuarios', section: 'Administración' });
    items.push({ href: '/asesoras', icon: 'UserPlus', label: 'Asesoras' });
    items.push({ href: '/inventario/modelos', icon: 'Award', label: 'Modelos Base', section: 'Inventario' });
    items.push({ href: '/inventario/lotes', icon: 'Settings', label: 'Lotes de Piedras' });
    items.push({ href: '/inventario/canales', icon: 'Tag', label: 'Canales de Venta' });
  }

  items.push({ href: '/alertas', icon: 'Bell', label: 'Alertas', section: 'Sistema' });

  return items;
}

export function SidebarContent({ user, navItems }: { user: any; navItems: any[] }) {
  let lastSection = '';

  return (
    <>
      <div className="mb-8 lg:mb-12">
        <h1 className="text-xl tracking-widest text-center text-[#333333] uppercase font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
          Maria Salinas
        </h1>
        <p className="text-xs text-center text-[#8E8D8A] tracking-wider mt-1">Internal Ops</p>
      </div>

      <nav className="flex-1 w-full space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <div key={i}>
              {showSection && (
                <div className="pt-4 pb-1">
                  <p className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider pl-4">{item.section}</p>
                </div>
              )}
              <SidebarLink href={item.href} icon={item.icon} label={item.label} />
            </div>
          );
        })}
      </nav>

      <div className="mt-auto w-full border-t border-[#D8D3CC] pt-4 flex flex-col gap-2 px-2">
        <div className="flex flex-col gap-1 text-xs text-[#333333] bg-[#F5F2EE] p-3 rounded border border-[#D8D3CC]">
          <div className="flex items-center gap-2 border-b border-[#D8D3CC] pb-2 mb-1">
            <User size={16} className="text-[#C5B358] flex-shrink-0" />
            <span className="font-semibold text-sm truncate">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8E8D8A]">Rol:</span>
            <span className="font-medium capitalize">
              {user.role === 'manager' ? 'Manager'
                : user.role === 'certificate_operator' ? 'Certificados'
                : user.role === 'stock_operator' ? 'Stock'
                : 'Asesora'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#D8D3CC]">
            <form action={logout}>
              <button type="submit" className="flex items-center gap-2 w-full text-left text-sm text-red-600 hover:text-red-700 font-medium py-1 transition-colors">
                <LogOut size={16} /><span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors text-[#333333] hover:bg-[#F5F2EE]"
    >
      <span className="text-[#8E8D8A]">{getIcon(icon)}</span>
      {label}
    </Link>
  );
}

function getIcon(name: string) {
  const icons: Record<string, React.ReactNode> = {
    Home: <Home size={18} />,
    FileText: <FileText size={18} />,
    ShoppingBag: <ShoppingBag size={18} />,
    Bell: <Bell size={18} />,
    Settings: <Settings size={18} />,
    Calculator: <Calculator size={18} />,
    Award: <Award size={18} />,
    User: <User size={18} />,
    Users: <Users size={18} />,
    UserPlus: <UserPlus size={18} />,
    Package: <Package size={18} />,
    Tag: <Tag size={18} />,
    Menu: <Menu size={18} />,
  };
  return icons[name] || <Bell size={18} />;
}
