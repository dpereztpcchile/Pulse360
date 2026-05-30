'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const SHIFTS: { key: string; label: string }[] = [
  { key: 'MANANA', label: 'Mañana' },
  { key: 'TARDE', label: 'Tarde' },
  { key: 'NOCHE', label: 'Noche' },
]

export function ShiftToggle({ turno }: { turno: string }) {
  const router = useRouter()
  const pathname = usePathname()
  return (
    <div className="inline-flex rounded-lg border border-border-dark overflow-hidden">
      {SHIFTS.map((s) => (
        <button
          key={s.key}
          onClick={() => router.push(`${pathname}?turno=${s.key}`)}
          className={cn('px-3 py-1.5 text-sm font-medium transition-colors',
            turno === s.key ? 'bg-pulse-red text-white' : 'bg-card-dark text-[#999] hover:text-white')}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
