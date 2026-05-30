import { cn } from '@/lib/utils'

type StatusType = 'ok' | 'warn' | 'stop' | 'info'

const styles: Record<StatusType, string> = {
  ok:   'badge-ok',
  warn: 'badge-warn',
  stop: 'badge-stop',
  info: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20',
}

const dots: Record<StatusType, string> = {
  ok:   'bg-status-ok',
  warn: 'bg-status-warn',
  stop: 'bg-pulse-red',
  info: 'bg-blue-400',
}

interface StatusBadgeProps {
  status: StatusType
  label: string
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, label, pulse = false, className }: StatusBadgeProps) {
  return (
    <span className={cn(styles[status], className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dots[status], pulse && 'animate-pulse')} />
      {label}
    </span>
  )
}
