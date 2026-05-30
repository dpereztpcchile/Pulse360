'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, ClipboardList, GaugeCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Tablero de líneas', href: '/produccion', icon: LayoutGrid },
  { label: 'Órdenes', href: '/produccion/ordenes', icon: ClipboardList },
  { label: 'Control de Turno', href: '/produccion/control-turno', icon: GaugeCircle },
]

export function ProductionTabs() {
  const pathname = usePathname()
  return (
    <div className="flex items-center gap-1 border-b border-border-dark">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = href === '/produccion' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-pulse-red text-white'
                : 'border-transparent text-[#666] hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
