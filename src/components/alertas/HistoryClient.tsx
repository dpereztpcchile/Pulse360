'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, AlertOctagon, Timer, Loader2, FileSearch } from 'lucide-react'
import { cn, ALERT_MODULE, ALERT_SEVERITY, formatDuration, formatDateTime } from '@/lib/utils'
import type { HistoryResult } from '@/lib/alerts'

export function HistoryClient({ initial }: { initial: HistoryResult }) {
  const [data, setData] = useState<HistoryResult>(initial)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [severity, setSeverity] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (moduleFilter) params.set('module', moduleFilter)
      if (severity) params.set('severity', severity)
      const res = await fetch(`/api/alerts/history?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [from, to, moduleFilter, severity])

  useEffect(() => { load() }, [load])

  const { rows, kpis } = data
  const inputCls = 'px-3 py-1.5 rounded-lg text-sm bg-card-dark border border-border-dark text-[#ccc] focus:outline-none focus:border-pulse-red'

  return (
    <div className="space-y-5">
      {/* KPIs del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={<Timer className="w-5 h-5 text-blue-400" />}
          label="Tiempo promedio de respuesta (mes)"
          value={kpis.avgResponseMs != null ? formatDuration(kpis.avgResponseMs) : '—'}
        />
        <KpiCard
          icon={<AlertOctagon className="w-5 h-5 text-pulse-red" />}
          label="Alertas críticas del mes"
          value={String(kpis.criticalThisMonth)}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-status-ok" />}
          label="% resueltas en < 1 hora"
          value={kpis.pctResolvedUnderHour != null ? `${kpis.pctResolvedUnderHour}%` : '—'}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-[#666] mb-1">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-[#666] mb-1">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-[#666] mb-1">Módulo</label>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {Object.entries(ALERT_MODULE).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#666] mb-1">Severidad</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {Object.entries(ALERT_SEVERITY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#666] mb-2" />}
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] uppercase tracking-wide border-b border-border-dark">
              <th className="px-4 py-3 font-medium">Fecha / hora</th>
              <th className="px-4 py-3 font-medium">Módulo</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Severidad</th>
              <th className="px-4 py-3 font-medium">Reconoció</th>
              <th className="px-4 py-3 font-medium">Resolvió</th>
              <th className="px-4 py-3 font-medium">T. respuesta</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#555]">
                  <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No hay alertas resueltas para los filtros seleccionados.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const mod = ALERT_MODULE[r.module]
              const sev = ALERT_SEVERITY[r.severity]
              return (
                <tr key={r.id} className="border-b border-border-dark/60 hover:bg-border-dark/30">
                  <td className="px-4 py-3 text-[#ccc] whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', mod.cls)}>{mod.label}</span></td>
                  <td className="px-4 py-3 text-[#bbb] max-w-md"><span className="font-medium text-white">{r.title}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', sev.badge)}>{sev.label}</span></td>
                  <td className="px-4 py-3 text-[#999] whitespace-nowrap">{r.acknowledgedBy ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.autoResolved
                      ? <span className="text-[#666] italic">Automático</span>
                      : <span className="text-[#999]">{r.resolvedBy ?? '—'}</span>}
                  </td>
                  <td className="px-4 py-3 text-[#ccc] whitespace-nowrap">
                    {r.responseMs != null ? formatDuration(r.responseMs) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="p-2.5 rounded-lg bg-border-dark/50 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-[#666]">{label}</p>
        <p className="font-rajdhani font-bold text-2xl text-white leading-tight">{value}</p>
      </div>
    </div>
  )
}
