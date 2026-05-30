import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'
import { KpiTile } from '@/components/dashboard/KpiTile'
import { CircularGauge, SemiGauge } from '@/components/dashboard/Gauges'
import { NsWeeklyChart, ReprocesoChart, LossesMiniBars } from '@/components/dashboard/DashboardCharts'
import { CapacityChart } from '@/components/capacidad/CapacityChart'
import { cn, LINE_STATUS } from '@/lib/utils'
import {
  Factory, Package, Truck, AlertTriangle, Repeat, Zap, Thermometer, Gauge,
  Clock, ChevronRight, DollarSign,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'
  const d = await getDashboardData()

  // Operadores en mobile: vista simplificada (solo líneas + alertas).
  const heavyHidden = role === 'OPERADOR' ? 'hidden lg:grid' : 'grid'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard Operacional</h1>
          <p className="text-sm text-[#666] mt-0.5">
            Bienvenido, <span className="text-white font-medium">{session?.user?.name}</span> — pulso del turno en tiempo real
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#666]">
          <span className="w-2 h-2 rounded-full bg-status-ok animate-pulse" /> En vivo
        </span>
      </div>

      {/* KPIs superiores */}
      <div className={cn(heavyHidden, 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3')}>
        <KpiTile title="NS Día (kg)" value={d.nsDay.value.toLocaleString('es-CL')} unit="kg" icon={Factory}
          delta={{ value: d.nsDay.deltaPct, suffix: '%', positiveIsGood: true }} sub="vs ayer" />
        <KpiTile title="Producción Real (kg)" value={d.realProd.value.toLocaleString('es-CL')} unit="kg" icon={Package}
          delta={{ value: d.realProd.variancePct, suffix: '%', positiveIsGood: true }} sub="vs plan" />

        {/* Capacidad utilizada — gauge circular */}
        <div className="card p-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider leading-tight">Capacidad<br />Utilizada</p>
            <Gauge className="w-4 h-4 text-[#555] mt-2" />
          </div>
          <CircularGauge value={d.capacityUsedPct} size={104} stroke={9} />
        </div>

        <KpiTile title="Despachos (kg)" value={d.dispatchesKg.toLocaleString('es-CL')} unit="kg" icon={Truck} sub="total del día" />

        <KpiTile title="Reproceso (%)" value={d.reprocesoPct.value} unit="%" icon={Repeat}
          delta={{ value: d.reprocesoPct.deltaPp, suffix: 'pp', positiveIsGood: false }} sub="vs ayer" />

        <KpiTile title="Quiebres" value={d.quiebres} icon={AlertTriangle}
          sub={d.quiebres > 0 ? 'insumos bajo mínimo' : 'sin quiebres'} />

        {/* OEE — gauge semicircular */}
        <div className="card p-4 flex flex-col items-center justify-center">
          <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider self-start flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> OEE
          </p>
          <SemiGauge value={d.oee} width={140} />
        </div>

        <KpiTile title="Temp. Prom. (°C)" value={d.temp.value} unit="°C" icon={Thermometer}
          sub={d.temp.minsAgo > 0 ? `hace ${d.temp.minsAgo} min` : 'sin registro'} />
      </div>

      {/* Cuerpo: pulso operacional + charts | alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Pulso operacional — líneas */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <Factory className="w-4 h-4 text-pulse-red" /> Pulso Operacional — Líneas de Producción
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.lines.map((l) => {
                const st = LINE_STATUS[l.status]
                const blocks = 10
                const filled = Math.round((l.oee / 100) * blocks)
                return (
                  <div key={l.id} className="rounded-lg bg-bg-dark border border-border-dark p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn('font-bold uppercase tracking-wide text-sm',
                        l.status === 'OPERANDO' ? 'text-status-ok' : l.status === 'EN_OBSERVACION' ? 'text-status-warn' : 'text-pulse-red')}>
                        {l.name}
                      </span>
                      <span className={cn(st.badge, 'shrink-0')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot, l.status === 'OPERANDO' && 'animate-pulse')} />
                        {st.label}
                      </span>
                    </div>
                    {/* Barra OEE de bloques */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1 flex-1">
                        {Array.from({ length: blocks }, (_, i) => (
                          <span key={i} className={cn('h-2 flex-1 rounded-sm',
                            i < filled ? st.bar : 'bg-border-dark')} />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-[#ccc] tabular-nums w-12 text-right">OEE {l.oee}%</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-[#666] uppercase tracking-wide">Producción hoy</p>
                        <p className="font-rajdhani font-bold text-xl text-white">{l.producedToday.toLocaleString('es-CL')} <span className="text-xs text-[#666] font-normal">kg</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#666] uppercase tracking-wide">Utilización</p>
                        <p className="font-rajdhani font-bold text-xl text-white">{l.utilization}<span className="text-xs text-[#666] font-normal">%</span></p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Charts inferiores */}
          <div className={cn(heavyHidden, 'grid-cols-1 sm:grid-cols-2 gap-4')}>
            <div className="card">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-3">NS Semanal</h3>
              <NsWeeklyChart data={d.nsWeekly} />
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-3">Capacidad vs Demanda</h3>
              <CapacityChart data={d.capDemand} />
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-3">Reproceso (%)</h3>
              <ReprocesoChart data={d.reprocesoSeries} />
            </div>
            <div className="card flex flex-col">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-pulse-red" /> Pérdidas Estimadas
              </h3>
              <p className="font-rajdhani font-bold text-4xl text-pulse-red leading-none mt-2">
                ${d.lossesUsd.toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-[#666] mt-1 mb-2">acumulado del período</p>
              <div className="mt-auto"><LossesMiniBars values={d.lossesBars} /></div>
            </div>
          </div>
        </div>

        {/* Alertas en tiempo real */}
        <aside className="card flex flex-col">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-pulse-red" /> Alertas en Tiempo Real
          </h2>
          <div className="space-y-3 flex-1">
            {d.alerts.length === 0 && (
              <p className="text-sm text-[#555] py-6 text-center">Sin alertas activas</p>
            )}
            {d.alerts.map((a, i) => (
              <div key={i} className="flex gap-3 items-start">
                <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0',
                  a.type === 'stop' ? 'text-pulse-red' : a.type === 'warn' ? 'text-status-warn' : 'text-status-ok')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#ccc] leading-snug">{a.msg}</p>
                  <span className="text-[11px] text-[#555] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {a.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/alertas"
            className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-pulse-red hover:text-pulse-red-hover transition-colors group">
            <span className="text-sm font-semibold">{d.activeAlerts} alerta{d.activeAlerts === 1 ? '' : 's'} activa{d.activeAlerts === 1 ? '' : 's'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </aside>
      </div>
    </div>
  )
}
