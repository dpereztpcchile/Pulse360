'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, History, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  isAdmin: boolean
}

export function AlertasTabs({ isAdmin }: Props) {
  const pathname = usePathname()
  const tabs = [
    { label: 'Alertas activas', href: '/alertas', icon: Bell, show: true },
    { label: 'Historial', href: '/alertas/historial', icon: History, show: true },
    { label: 'Configuración', href: '/alertas/configuracion', icon: SlidersHorizontal, show: isAdmin },
  ].filter((t) => t.show)

  return (
    <div className="flex items-center gap-1 border-b border-border-dark">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              active ? 'border-pulse-red text-white' : 'border-transparent text-[#666] hover:text-white',
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
