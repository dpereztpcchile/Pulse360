'use client'

import { cn } from '@/lib/utils'

export type Estado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'

const ESTADO_META: Record<Estado, { label: string; cls: string }> = {
  PENDIENTE:  { label: 'Pendiente',  cls: 'bg-[#2A2A2A] text-[#999]' },
  EN_PROCESO: { label: 'En proceso', cls: 'bg-status-warn/15 text-status-warn' },
  COMPLETADO: { label: 'Completado', cls: 'bg-status-ok/15 text-status-ok' },
}

export function EstadoBadge({ estado }: { estado: Estado }) {
  const m = ESTADO_META[estado] ?? ESTADO_META.PENDIENTE
  return <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', m.cls)}>{m.label}</span>
}

export function fmtHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs text-[#666] mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', accent ? 'text-pulse-red' : 'text-white')}>{value}</p>
    </div>
  )
}

/** Horas trabajadas = (término - inicio) en horas × dotación */
export function horasTrabajadas(inicio: string | null, termino: string | null, dotacion: number | null): number {
  if (!inicio || !termino) return 0
  const ms = new Date(termino).getTime() - new Date(inicio).getTime()
  if (ms <= 0) return 0
  return (ms / 3_600_000) * (dotacion || 0)
}
