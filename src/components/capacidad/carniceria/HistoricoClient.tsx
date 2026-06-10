'use client'

import { useEffect, useState, useCallback, type ComponentType } from 'react'
import { Loader2, TrendingUp, AlertTriangle, AlertCircle, Activity } from 'lucide-react'
import { CapacidadHistChart } from './CapacidadHistChart'
import { ESTADO_META, DAY_SHORT } from '@/lib/capacidad/carniceria'
import { cn } from '@/lib/utils'
import type { HistoricoResult } from '@/lib/capacidad/service'

const ESTADOS = [
  { key: 'todos', label: 'Todos' },
  { key: 'estres', label: 'Solo estrés' },
  { key: 'advertencia', label: 'Advertencia' },
]

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

export function HistoricoClient({ initial, desde: desde0, hasta: hasta0 }: { initial: HistoricoResult; desde: string; hasta: string }) {
  const [desde, setDesde] = useState(desde0)
  const [hasta, setHasta] = useState(hasta0)
  const [estado, setEstado] = useState('todos')
  const [data, setData] = useState<HistoricoResult>(initial)
  const [loading, setLoading] = useState(false)

  const load = useCallback((d: string, h: string, e: string) => {
    setLoading(true)
    fetch(`/api/capacidad/carniceria/historico?desde=${d}&hasta=${h}&estado=${e}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // El filtro de estado recarga al instante; el de fechas con el botón "Aplicar".
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) { setMounted(true); return }
    load(desde, hasta, estado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  const { kpis, rows } = data

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="card p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] text-[#888] mb-1">Desde</label>
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)}
            className="bg-bg-dark border border-border-dark rounded-lg px-3 py-1.5 text-sm text-white focus:border-pulse-red outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-[#888] mb-1">Hasta</label>
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)}
            className="bg-bg-dark border border-border-dark rounded-lg px-3 py-1.5 text-sm text-white focus:border-pulse-red outline-none" />
        </div>
        <button onClick={() => load(desde, hasta, estado)}
          className="px-4 py-1.5 rounded-lg bg-pulse-red text-white text-sm font-semibold hover:bg-pulse-red/90">Aplicar</button>
        <div className="inline-flex rounded-lg border border-border-dark overflow-hidden ml-auto">
          {ESTADOS.map((e) => (
            <button key={e.key} onClick={() => setEstado(e.key)}
              className={cn('px-3 py-1.5 text-sm font-medium transition-colors',
                estado === e.key ? 'bg-pulse-red text-white' : 'bg-card-dark text-[#999] hover:text-white')}>
              {e.label}
            </button>
          ))}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#666]" />}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Activity} label="Ocupación promedio" value={`${kpis.ocupacionProm}%`} accent />
        <KpiCard icon={AlertCircle} label="Días con estrés (≥100%)" value={kpis.diasEstres} color="#CC0000" />
        <KpiCard icon={AlertTriangle} label="Días con advertencia (90–99%)" value={kpis.diasAlerta} color="#F59E0B" />
        <KpiCard icon={TrendingUp} label="Productividad real prom." value={kpis.prodRealProm != null ? `${kpis.prodRealProm} Kg/HH` : '—'} />
      </div>

      {/* Gráfico */}
      <div className="card">
        <h3 className="font-semibold text-white mb-3">Capacidad vs pedido (kg MP)</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-[#555] py-10 text-center">Sin datos para los filtros seleccionados.</p>
        ) : <CapacidadHistChart rows={rows} />}
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Cap. kg</th>
              <th className="px-4 py-3 font-medium text-right">Pedido kg</th>
              <th className="px-4 py-3 font-medium text-right">Ocup. %</th>
              <th className="px-4 py-3 font-medium text-right">Prod. real</th>
              <th className="px-4 py-3 font-medium text-right">Holgura</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#555]">Sin registros.</td></tr>
            ) : rows.slice().reverse().map((r) => {
              const meta = ESTADO_META[r.estado]
              const rowStyle = r.estado === 'ESTRES' ? { backgroundColor: meta.bg, borderLeft: `3px solid ${meta.color}` }
                : r.estado === 'ALERTA' ? { backgroundColor: meta.bg, borderLeft: `3px solid ${meta.color}` }
                : { borderLeft: '3px solid transparent' }
              const deficit = r.holguraKgMP < 0
              return (
                <tr key={r.fecha} className="border-b border-border-dark" style={rowStyle}>
                  <td className="px-4 py-2.5 text-white">{r.fecha} <span className="text-xs text-[#666]">{DAY_SHORT[r.diaSemana - 1]}</span></td>
                  <td className="px-4 py-2.5 text-right text-[#ccc]">{fmt(r.capacidadKgMP)}</td>
                  <td className="px-4 py-2.5 text-right text-[#ccc]">{fmt(r.pedidoKgMP)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: meta.color }}>{r.ocupacionPorc}%</td>
                  <td className="px-4 py-2.5 text-right text-[#ccc]">{r.prodRealKgHH != null ? `${r.prodRealKgHH}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: deficit ? '#CC0000' : '#22C55E' }}>{deficit ? '' : '+'}{fmt(r.holguraKgMP)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {meta.label.toUpperCase()}
                    </span>
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

function KpiCard({ icon: Icon, label, value, accent, color }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; accent?: boolean; color?: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#666]" />
        <p className="text-xs text-[#666]">{label}</p>
      </div>
      <p className="text-2xl font-bold" style={color ? { color } : undefined}>
        <span className={accent ? 'text-pulse-red' : color ? '' : 'text-white'}>{value}</span>
      </p>
    </div>
  )
}
