'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertOctagon, AlertTriangle, Info, Check, CheckCircle2, Loader2, X, RefreshCw, Inbox,
} from 'lucide-react'
import { cn, ALERT_MODULE, ALERT_SEVERITY, formatDuration } from '@/lib/utils'
import type { ActiveAlertDTO, ActiveAlertsResult } from '@/lib/alerts'

type FilterKey = 'all' | 'critical' | 'unacknowledged'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'critical', label: 'Solo críticas' },
  { key: 'unacknowledged', label: 'Solo sin reconocer' },
]

const SEVERITY_ICON = {
  CRITICA: AlertOctagon,
  ADVERTENCIA: AlertTriangle,
  INFORMATIVA: Info,
} as const

function timeAgo(iso: string) {
  return `hace ${formatDuration(Date.now() - new Date(iso).getTime())}`
}
function clock(iso: string) {
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function ActiveAlertsClient({ initial, canResolve }: { initial: ActiveAlertsResult; canResolve: boolean }) {
  const [data, setData] = useState<ActiveAlertsResult>(initial)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('filter', filter)
      if (moduleFilter) params.set('module', moduleFilter)
      const res = await fetch(`/api/alerts?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch { /* ignore polling errors */ } finally {
      if (!silent) setLoading(false)
    }
  }, [filter, moduleFilter])

  // Recarga al cambiar filtros
  useEffect(() => { load() }, [load])

  // Polling cada 30s
  useEffect(() => {
    const id = setInterval(() => load(true), 30_000)
    return () => clearInterval(id)
  }, [load])

  async function acknowledge(id: string) {
    setBusyId(id); setError('')
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al reconocer'); return }
      await load(true)
    } catch { setError('Error de conexión') } finally { setBusyId(null) }
  }

  async function resolve(id: string) {
    if (!note.trim()) { setError('Escribe una nota de resolución'); return }
    setBusyId(id); setError('')
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', note }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al resolver'); return }
      setResolvingId(null); setNote('')
      await load(true)
    } catch { setError('Error de conexión') } finally { setBusyId(null) }
  }

  const { counts, alerts } = data

  const counters: { sev: keyof typeof ALERT_SEVERITY; n: number }[] = [
    { sev: 'CRITICA', n: counts.CRITICA },
    { sev: 'ADVERTENCIA', n: counts.ADVERTENCIA },
    { sev: 'INFORMATIVA', n: counts.INFORMATIVA },
  ]

  return (
    <div className="space-y-5">
      {/* Contadores por severidad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {counters.map(({ sev, n }) => {
          const cfg = ALERT_SEVERITY[sev]
          const Icon = SEVERITY_ICON[sev]
          return (
            <div key={sev} className={cn(
              'rounded-xl px-5 py-4 flex items-center justify-between border',
              sev === 'CRITICA' && 'bg-pulse-red border-pulse-red',
              sev === 'ADVERTENCIA' && 'bg-status-warn border-status-warn',
              sev === 'INFORMATIVA' && 'bg-card-dark border-border-dark',
            )}>
              <div>
                <p className={cn('text-xs font-semibold uppercase tracking-wider',
                  sev === 'CRITICA' && 'text-white/80',
                  sev === 'ADVERTENCIA' && 'text-black/70',
                  sev === 'INFORMATIVA' && 'text-[#777]',
                )}>{cfg.label}</p>
                <p className={cn('font-rajdhani font-bold text-4xl leading-tight',
                  sev === 'CRITICA' && 'text-white',
                  sev === 'ADVERTENCIA' && 'text-black',
                  sev === 'INFORMATIVA' && 'text-[#999]',
                )}>{n}</p>
              </div>
              <Icon className={cn('w-8 h-8',
                sev === 'CRITICA' && 'text-white/90',
                sev === 'ADVERTENCIA' && 'text-black/70',
                sev === 'INFORMATIVA' && 'text-[#555]',
              )} />
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              filter === f.key
                ? 'bg-pulse-red border-pulse-red text-white'
                : 'bg-card-dark border-border-dark text-[#999] hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-card-dark border border-border-dark text-[#999] focus:outline-none focus:border-pulse-red"
        >
          <option value="">Todos los módulos</option>
          {Object.entries(ALERT_MODULE).map(([key, m]) => (
            <option key={key} value={key}>{m.label}</option>
          ))}
        </select>
        <button
          onClick={() => load()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#999] hover:text-white border border-border-dark bg-card-dark"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Lista de alertas */}
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="card text-center py-14 text-[#555]">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay alertas activas con los filtros seleccionados.</p>
          </div>
        )}

        {alerts.map((a) => (
          <AlertCard
            key={a.id}
            alert={a}
            canResolve={canResolve}
            busy={busyId === a.id}
            resolving={resolvingId === a.id}
            note={resolvingId === a.id ? note : ''}
            onNote={setNote}
            onAcknowledge={() => acknowledge(a.id)}
            onStartResolve={() => { setResolvingId(a.id); setNote(''); setError('') }}
            onCancelResolve={() => { setResolvingId(null); setNote('') }}
            onResolve={() => resolve(a.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AlertCard({
  alert, canResolve, busy, resolving, note, onNote,
  onAcknowledge, onStartResolve, onCancelResolve, onResolve,
}: {
  alert: ActiveAlertDTO
  canResolve: boolean
  busy: boolean
  resolving: boolean
  note: string
  onNote: (v: string) => void
  onAcknowledge: () => void
  onStartResolve: () => void
  onCancelResolve: () => void
  onResolve: () => void
}) {
  const sev = ALERT_SEVERITY[alert.severity]
  const mod = ALERT_MODULE[alert.module]
  const Icon = SEVERITY_ICON[alert.severity]
  const isCritical = alert.severity === 'CRITICA'
  const acknowledged = alert.status === 'RECONOCIDA'

  return (
    <div
      className={cn(
        'card border transition-colors',
        isCritical ? 'border-l-4 border-l-pulse-red border-pulse-red/20' : 'border-border-dark',
      )}
      style={isCritical ? { backgroundColor: '#CC000015' } : undefined}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-2 rounded-lg shrink-0 mt-0.5',
          isCritical ? 'bg-pulse-red/15' : alert.severity === 'ADVERTENCIA' ? 'bg-status-warn/15' : 'bg-border-dark',
        )}>
          <Icon className={cn('w-4 h-4', sev.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-white">{alert.title}</span>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', sev.badge)}>{sev.label}</span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', mod.cls)}>{mod.label}</span>
            {acknowledged && (
              <span className="flex items-center gap-1 text-xs text-status-warn font-medium">
                <Check className="w-3 h-3" /> Reconocida{alert.acknowledgedBy ? ` por ${alert.acknowledgedBy}` : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-[#aaa]">{alert.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#555] flex-wrap">
            <span>{clock(alert.createdAt)} · {timeAgo(alert.createdAt)}</span>
            {alert.responsible && <span>· Responsable: <span className="text-[#888]">{alert.responsible}</span></span>}
          </div>

          {resolving && (
            <div className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => onNote(e.target.value)}
                rows={2}
                placeholder="Describe la acción tomada para resolver esta alerta…"
                className="w-full px-3 py-2 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red resize-none"
              />
              <div className="flex items-center gap-2">
                <button onClick={onResolve} disabled={busy} className="btn-primary text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar resolución
                </button>
                <button onClick={onCancelResolve} className="btn-secondary text-sm">
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {!resolving && (
          <div className="flex flex-col gap-2 shrink-0">
            {!acknowledged && (
              <button onClick={onAcknowledge} disabled={busy}
                className="btn-secondary text-xs whitespace-nowrap disabled:opacity-60">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Reconocer
              </button>
            )}
            {canResolve && (
              <button onClick={onStartResolve}
                className="btn-primary text-xs whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
