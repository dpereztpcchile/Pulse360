import Link from 'next/link'
import { CalendarRange, Settings, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SubViewTabs({ vista, isAdmin }: { vista: 'semanal' | 'saturacion' | 'dia' | 'historico' | 'horarios'; isAdmin?: boolean }) {
  const tabs = [
    { key: 'semanal', label: 'Capacidad Semanal', href: '/capacidad', icon: CalendarRange, admin: false },
    { key: 'saturacion', label: 'Saturación Semanal', href: '/capacidad?vista=saturacion', icon: TrendingUp, admin: false },
    { key: 'horarios', label: 'Horarios', href: '/capacidad?vista=horarios', icon: Settings, admin: true },
  ] as const
  return (
    <div className="inline-flex rounded-lg border border-border-dark overflow-hidden">
      {tabs.filter((t) => !t.admin || isAdmin).map((t) => {
        const active = vista === t.key
        return (
          <Link
            key={t.key}
            href={t.href}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              active ? 'bg-pulse-red text-white' : 'bg-card-dark text-[#999] hover:text-white')}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </Link>
        )
      })}
    </div>
  )
}
