import Link from 'next/link'
import { CalendarDays, History } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SubViewTabs({ vista }: { vista: 'dia' | 'historico' }) {
  const tabs = [
    { key: 'dia', label: 'Vista del día', href: '/capacidad', icon: CalendarDays },
    { key: 'historico', label: 'Histórico', href: '/capacidad?vista=historico', icon: History },
  ] as const
  return (
    <div className="inline-flex rounded-lg border border-border-dark overflow-hidden">
      {tabs.map((t) => {
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
