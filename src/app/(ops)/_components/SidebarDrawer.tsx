"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Home, FileText, ShoppingBag, Bell, Settings, Calculator, Award, User, LogOut, Users, UserPlus, Package, Tag } from "lucide-react"

function getIcon(name: string) {
  const icons: Record<string, React.ReactNode> = {
    Home: <Home size={18} />, FileText: <FileText size={18} />,
    ShoppingBag: <ShoppingBag size={18} />, Bell: <Bell size={18} />,
    Settings: <Settings size={18} />, Calculator: <Calculator size={18} />,
    Award: <Award size={18} />, User: <User size={18} />,
    Users: <Users size={18} />, UserPlus: <UserPlus size={18} />,
    Package: <Package size={18} />, Tag: <Tag size={18} />,
  }
  return icons[name] || <Bell size={18} />
}

export default function SidebarDrawer({ user, navItems }: { user: any; navItems: any[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar drawer al navegar
  useEffect(() => { setOpen(false) }, [pathname])

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  let lastSection = ''

  return (
    <>
      {/* Barra superior móvil/iPad — solo visible en <lg */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#D8D3CC] flex items-center justify-between px-4 py-3 shadow-sm">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-md text-[#333333] hover:bg-[#F5F2EE] transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-base tracking-widest text-[#333333] uppercase font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
          Maria Salinas
        </h1>
        <div className="w-10" /> {/* spacer para centrar título */}
      </div>

      {/* Espacio para la barra fija en móvil */}
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl flex flex-col py-6 px-4 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg tracking-widest text-[#333333] uppercase font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
              Maria Salinas
            </h1>
            <p className="text-xs text-[#8E8D8A] tracking-wider mt-0.5">Internal Ops</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 rounded-md text-[#8E8D8A] hover:bg-[#F5F2EE] transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const showSection = item.section && item.section !== lastSection
            if (item.section) lastSection = item.section
            const isActive = pathname === item.href

            return (
              <div key={i}>
                {showSection && (
                  <div className="pt-4 pb-1">
                    <p className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider pl-4">{item.section}</p>
                  </div>
                )}
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors ${isActive ? 'bg-[#F5F2EE] text-[#333333] font-semibold' : 'text-[#333333] hover:bg-[#F5F2EE]'}`}
                >
                  <span className={isActive ? 'text-[#C5B358]' : 'text-[#8E8D8A]'}>{getIcon(item.icon)}</span>
                  {item.label}
                </Link>
              </div>
            )
          })}
        </nav>

        {/* Info usuario */}
        <div className="border-t border-[#D8D3CC] pt-4 mt-4">
          <div className="flex flex-col gap-1 text-xs text-[#333333] bg-[#F5F2EE] p-3 rounded border border-[#D8D3CC]">
            <div className="flex items-center gap-2 border-b border-[#D8D3CC] pb-2 mb-1">
              <User size={16} className="text-[#C5B358]" />
              <span className="font-semibold text-sm truncate">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8D8A]">Rol:</span>
              <span className="font-medium">
                {user.role === 'manager' ? 'Manager'
                  : user.role === 'certificate_operator' ? 'Certificados'
                  : user.role === 'stock_operator' ? 'Stock'
                  : 'Asesora'}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#D8D3CC]">
              <form action="/api/logout" method="POST">
                <button type="submit" className="flex items-center gap-2 w-full text-left text-sm text-red-600 hover:text-red-700 font-medium py-1 transition-colors">
                  <LogOut size={16} /><span>Cerrar Sesión</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
