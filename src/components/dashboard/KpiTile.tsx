import type { LucideIcon } from 'lucide-react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function KpiTile({
  title, value, unit, icon: Icon, delta, sub,
}: {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  /** delta opcional. positiveIsGood define el color: subir es bueno (verde) o malo (rojo). */
  delta?: { value: number; suffix: string; positiveIsGood: boolean }
  sub?: string
}) {
  let deltaColor = 'text-[#888]'
  if (delta && delta.value !== 0) {
    const good = delta.value > 0 ? delta.positiveIsGood : !delta.positiveIsGood
    deltaColor = good ? 'text-status-ok' : 'text-pulse-red'
  }

  return (
    <div className="card p-4 flex flex-col justify-between min-h-[112px]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider leading-tight">{title}</p>
        <Icon className="w-4 h-4 text-[#555] shrink-0" />
      </div>
      <div>
        <div className="flex items-end gap-1.5 mt-2">
          <span className="font-rajdhani font-bold text-3xl text-white leading-none tabular-nums">{value}</span>
          {unit && <span className="text-sm font-semibold text-[#666] mb-0.5">{unit}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 min-h-[16px]">
          {delta && (
            <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', deltaColor)}>
              {delta.value > 0 ? <ArrowUp className="w-3 h-3" /> : delta.value < 0 ? <ArrowDown className="w-3 h-3" /> : null}
              {Math.abs(delta.value)}{delta.suffix}
            </span>
          )}
          {sub && <span className="text-xs text-[#666] truncate">{sub}</span>}
        </div>
      </div>
    </div>
  )
}
