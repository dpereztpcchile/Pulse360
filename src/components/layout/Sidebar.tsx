'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Factory,
  Package,
  Truck,
  AlertTriangle,
  Gauge,
  Bell,
  FileBarChart,
  FileUp,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isModuleBlocked } from '@/lib/blocked-modules'

const NAV_ITEMS = [
  { label: 'Dashboard',         href: '/dashboard',          icon: LayoutDashboard, adminOnly: false },
  { label: 'Producción',        href: '/produccion',         icon: Factory,         adminOnly: false },
  { label: 'Materias Primas',   href: '/materias-primas',    icon: Package,         adminOnly: false },
  { label: 'Despacho',          href: '/despacho',           icon: Truck,           adminOnly: false },
  { label: 'No Conformidades',  href: '/no-conformidades',   icon: AlertTriangle,   adminOnly: false },
  { label: 'Capacidad',         href: '/capacidad',          icon: Gauge,           adminOnly: false },
  { label: 'Carga de Archivos', href: '/carga-archivos',     icon: FileUp,          adminOnly: true },
  { label: 'Alertas',           href: '/alertas',            icon: Bell,            adminOnly: false },
  { label: 'Reportes',          href: '/reportes',           icon: FileBarChart,    adminOnly: false },
  { label: 'Usuarios',          href: '/admin/usuarios',     icon: Users,           adminOnly: true },
  { label: 'Configuración',     href: '/configuracion',      icon: Settings,        adminOnly: true },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMINISTRADOR'
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  const [alertCount, setAlertCount] = useState(0)
  useEffect(() => {
    if (!session) return
    let active = true
    const load = () =>
      fetch('/api/materials/alerts')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (active && d) setAlertCount(d.total) })
        .catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => { active = false; clearInterval(id) }
  }, [session, pathname])

  // Badge de alertas críticas activas (polling cada 30s)
  const [criticalAlerts, setCriticalAlerts] = useState(0)
  useEffect(() => {
    if (!session) return
    let active = true
    const load = () =>
      fetch('/api/alerts/count')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (active && d) setCriticalAlerts(d.critical) })
        .catch(() => {})
    load()
    const id = setInterval(load, 30_000)
    return () => { active = false; clearInterval(id) }
  }, [session, pathname])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col',
        'bg-card-dark border-r border-border-dark',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-border-dark shrink-0 bg-[#050505]',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
          <Activity className="absolute w-5 h-5 text-pulse-red" strokeWidth={2.5} />
          <BarChart3 className="absolute w-7 h-7 text-white opacity-15" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold tracking-wider">
            <span className="text-white">PULSE</span>
            <span className="text-pulse-red">360</span>
          </span>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const badge =
            href === '/materias-primas' && alertCount > 0 ? alertCount :
            href === '/alertas' && criticalAlerts > 0 ? criticalAlerts : 0

          // Módulos en construcción: ítem deshabilitado (no navegable)
          if (isModuleBlocked(href)) {
            return (
              <div
                key={href}
                title={collapsed ? `${label} (en construcción)` : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#555] cursor-not-allowed select-none',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium truncate flex-1">{label}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-border-dark text-[#777] uppercase tracking-wide whitespace-nowrap">
                      En construcción
                    </span>
                  </>
                )}
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-colors duration-150 group',
                isActive
                  ? 'bg-pulse-red text-white'
                  : 'text-[#999] hover:bg-border-dark hover:text-white',
                collapsed && 'justify-center'
              )}
            >
              <span className="relative shrink-0">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                {badge > 0 && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-pulse-red text-white text-[10px] font-bold leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate flex-1">{label}</span>
              )}
              {!collapsed && badge > 0 && (
                <span className={cn(
                  'min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none',
                  isActive ? 'bg-white text-pulse-red' : 'bg-pulse-red text-white'
                )}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Toggle button */}
      <div className="p-2 border-t border-border-dark">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
            'text-[#666] hover:bg-border-dark hover:text-white transition-colors',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
