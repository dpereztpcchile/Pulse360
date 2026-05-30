import Link from 'next/link'
import { cn } from '@/lib/utils'

const LINES = [
  { code: 'CARNICERIA', label: 'Carnicería', enabled: true },
  { code: 'L4', label: 'Línea 4', enabled: false },
  { code: 'L5', label: 'Línea 5', enabled: false },
  { code: 'MOLIENDA', label: 'Molienda', enabled: false },
  { code: 'MOLIDA', label: 'Molida 1/2', enabled: false },
]

export function CapacidadLineTabs() {
  return (
    <div className="flex items-center gap-1 border-b border-border-dark overflow-x-auto">
      {LINES.map((l) =>
        l.enabled ? (
          <Link
            key={l.code}
            href="/capacidad"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px border-pulse-red text-white whitespace-nowrap"
          >
            {l.label}
          </Link>
        ) : (
          <span
            key={l.code}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px border-transparent',
              'text-[#444] cursor-not-allowed whitespace-nowrap',
            )}
          >
            {l.label}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-border-dark text-[#777] uppercase tracking-wide">
              Próximamente
            </span>
          </span>
        ),
      )}
    </div>
  )
}
