import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  status?: 'ok' | 'warn' | 'stop' | 'neutral'
  className?: string
}

const statusStyles = {
  ok:      { icon: 'text-status-ok',   border: 'border-l-status-ok',   bg: 'bg-status-ok/10' },
  warn:    { icon: 'text-status-warn', border: 'border-l-status-warn', bg: 'bg-status-warn/10' },
  stop:    { icon: 'text-pulse-red',   border: 'border-l-pulse-red',   bg: 'bg-pulse-red/10' },
  neutral: { icon: 'text-[#999]',      border: 'border-l-border-dark', bg: 'bg-border-dark/50' },
}

export function KPICard({ title, value, unit, icon: Icon, trend, status = 'neutral', className }: KPICardProps) {
  const s = statusStyles[status]

  return (
    <div className={cn('card border-l-4', s.border, className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-[#999] uppercase tracking-wider">{title}</p>
        <div className={cn('p-2 rounded-lg', s.bg)}>
          <Icon className={cn('w-5 h-5', s.icon)} strokeWidth={2} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="kpi-value text-white">{value}</span>
        {unit && <span className="text-lg font-semibold text-[#666] mb-1">{unit}</span>}
      </div>
      {trend && (
        <p className={cn('text-xs font-medium mt-2', trend.value >= 0 ? 'text-status-ok' : 'text-pulse-red')}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  )
}
