'use client'

import { Factory, TrendingUp, Gauge, AlertTriangle } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { CapacityChart } from '@/components/capacidad/CapacityChart'
import { cn, occupationState } from '@/lib/utils'

interface Row {
  lineId: string
  line: string
  lineCode: string
  capacidad: number
  demanda: number
  pct: number
  over: boolean
}

export function WeeklyClient({
  rows, kpis, periodLabel,
}: {
  rows: Row[]
  kpis: { totalCap: number; totalDem: number; globalPct: number; overloaded: number }
  periodLabel: string
}) {
  const chartData = rows.map((r) => ({
    line: r.lineCode, capacidad: r.capacidad, demanda: r.demanda, pct: r.pct, over: r.over,
  }))

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#888]">{periodLabel}</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Capacidad Semanal" value={kpis.totalCap.toLocaleString('es-CL')} unit="kg" icon={Factory} status="neutral" />
        <KPICard title="Demanda Planificada" value={kpis.totalDem.toLocaleString('es-CL')} unit="kg" icon={TrendingUp} status="stop" />
        <KPICard title="Ocupación Global" value={kpis.globalPct} unit="%" icon={Gauge}
          status={kpis.globalPct > 90 ? 'stop' : kpis.globalPct >= 80 ? 'warn' : 'ok'} />
        <KPICard title="Líneas Sobrecargadas" value={kpis.overloaded} unit="" icon={AlertTriangle}
          status={kpis.overloaded > 0 ? 'stop' : 'ok'} />
      </div>

      {/* Gráfico */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Capacidad vs Demanda por línea</h2>
          <div className="flex items-center gap-4 text-xs text-[#888]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-border-dark border border-[#3A3A3A]" /> Capacidad</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-pulse-red" /> Demanda</span>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="py-16 text-center text-[#555] text-sm">Sin líneas configuradas</p>
        ) : (
          <CapacityChart data={chartData} />
        )}
      </div>

      {/* Tabla resumen */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Línea</th>
                <th className="px-4 py-3 text-right font-medium">Capacidad instalada (kg/sem)</th>
                <th className="px-4 py-3 text-right font-medium">Demanda planificada (kg/sem)</th>
                <th className="px-4 py-3 text-left font-medium">% Ocupación</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[#555]">Sin líneas configuradas</td></tr>
              )}
              {rows.map((r) => {
                const st = occupationState(r.pct)
                return (
                  <tr key={r.lineId} className={cn('transition-colors', r.over ? 'bg-pulse-red/5' : 'hover:bg-border-dark/30')}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-white">
                        {r.over && <AlertTriangle className="w-3.5 h-3.5 text-pulse-red shrink-0" />}
                        {r.line}
                      </span>
                      <span className="block text-xs text-[#666] font-mono">{r.lineCode}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#ccc] tabular-nums">{r.capacidad.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-right text-[#ccc] tabular-nums">{r.demanda.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-bg-dark overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', st.bar)} style={{ width: `${Math.min(r.pct, 100)}%` }} />
                        </div>
                        <span className={cn('font-semibold tabular-nums', st.text)}>{r.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', st.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
