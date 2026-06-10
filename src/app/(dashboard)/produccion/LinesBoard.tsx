'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Gauge, Zap, User } from 'lucide-react'
import { cn, LINE_STATUS } from '@/lib/utils'
import { ESTADO_META } from '@/lib/capacidad/carniceria'

interface CapResumen {
  estado: 'HOLGURA' | 'ALERTA' | 'ESTRES'
  ocupacionPorc: number
  capacidadKgMP: number
  pedidoKgMP: number
  holguraKgMP: number
  hasProgram: boolean
}

interface Line {
  id: string
  name: string
  code: string
  status: keyof typeof LINE_STATUS
  dailyPlanKg: number
  oee: number
  utilization: number
  dayKg: number
  prodRealKgHH: number | null
  cap: CapResumen | null
  utilCapacidad: number | null
}

const fmtKg = (n: number) => Math.round(n).toLocaleString('es-CL')

export function LinesBoard({ initialLines }: { initialLines: Line[] }) {
  const router = useRouter()

  // Refresca los datos del tablero periódicamente para reflejar el avance de
  // los cortes de Carnicería (y demás líneas) sin recargar manualmente.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 20000)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
      {initialLines.map((line) => {
        const cfg = LINE_STATUS[line.status]
        const progress = line.dailyPlanKg > 0 ? Math.min(100, Math.round((line.dayKg / line.dailyPlanKg) * 100)) : 0
        return (
          <div key={line.id} className="card flex flex-col">
            {/* Encabezado: nombre + porcentaje de avance grande */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {cfg.active && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-ok" />
                  </span>
                )}
                <h3 className="font-rajdhani font-bold text-lg text-white uppercase tracking-wide">
                  {line.name}
                </h3>
              </div>
              <span className={cn('font-rajdhani font-bold leading-none text-4xl',
                progress >= 75 ? 'text-status-ok' : progress >= 40 ? 'text-status-warn' : progress > 0 ? 'text-pulse-red' : 'text-[#555]')}>
                {progress}<span className="text-xl text-[#666] font-normal">%</span>
              </span>
            </div>

            {/* Barra de progreso plan vs real */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[#666] mb-1.5">
                <span>Producción vs plan</span>
              </div>
              <div className="h-2.5 bg-bg-dark rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', cfg.bar)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#555] mt-1">
                <span className="font-rajdhani font-bold text-base text-white">
                  {line.dayKg.toLocaleString()} <span className="text-xs font-normal text-[#666]">kg hoy</span>
                </span>
                <span>Plan: {line.dailyPlanKg.toLocaleString()} kg</span>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-bg-dark rounded-lg p-3 border border-border-dark">
                <div className="flex items-center gap-1.5 text-xs text-[#666] mb-1">
                  <Gauge className="w-3.5 h-3.5" /> {line.code === 'CARNICERIA' ? 'Utilización de capacidad' : 'Utilización'}
                </div>
                {line.code === 'CARNICERIA' ? (
                  <p className="font-rajdhani font-bold text-2xl text-white">
                    {line.utilCapacidad != null ? <>{line.utilCapacidad}<span className="text-sm text-[#666] font-normal">%</span></> : '—'}
                  </p>
                ) : (
                  <p className="font-rajdhani font-bold text-2xl text-white">
                    {line.utilization}<span className="text-sm text-[#666] font-normal">%</span>
                  </p>
                )}
              </div>
              {line.code === 'CARNICERIA' ? (
                <div className="bg-bg-dark rounded-lg p-3 border border-border-dark">
                  <div className="flex items-center gap-1.5 text-xs text-[#666] mb-1">
                    <User className="w-3.5 h-3.5" /> Kg / HH
                  </div>
                  <p className="font-rajdhani font-bold text-2xl text-white">
                    {line.prodRealKgHH != null ? line.prodRealKgHH : '—'}
                  </p>
                </div>
              ) : (
                <div className="bg-bg-dark rounded-lg p-3 border border-border-dark">
                  <div className="flex items-center gap-1.5 text-xs text-[#666] mb-1">
                    <Zap className="w-3.5 h-3.5" /> OEE
                  </div>
                  <p className={cn('font-rajdhani font-bold text-2xl',
                    line.oee >= 75 ? 'text-status-ok' : line.oee >= 60 ? 'text-status-warn' : line.oee > 0 ? 'text-pulse-red' : 'text-[#555]')}>
                    {line.oee}<span className="text-sm text-[#666] font-normal">%</span>
                  </p>
                </div>
              )}
            </div>

            {/* Resumen condensado de capacidad (solo Carnicería) */}
            {line.code === 'CARNICERIA' && line.cap && (() => {
              const meta = ESTADO_META[line.cap.estado]
              const c = line.cap
              const deficit = c.holguraKgMP < 0
              return (
                <div className="mb-4 rounded-lg p-3 bg-bg-dark border border-border-dark" style={{ borderLeft: `3px solid ${meta.color}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="font-rajdhani font-bold text-sm uppercase tracking-wide" style={{ color: meta.color }}>{meta.label.toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-[#999]">{c.ocupacionPorc}% ocupación</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#666]">Cap: <span className="text-[#ccc]">{fmtKg(c.capacidadKgMP)} kg</span></span>
                    <span className="text-[#666]">{c.hasProgram ? <>Pedido: <span className="text-[#ccc]">{fmtKg(c.pedidoKgMP)} kg</span></> : 'Sin pedido'}</span>
                    <span className="font-semibold" style={{ color: deficit ? '#CC0000' : '#22C55E' }}>{deficit ? '' : '+'}{fmtKg(c.holguraKgMP)} kg</span>
                  </div>
                </div>
              )
            })()}

            {/* Estado de la línea — al fondo de la tarjeta */}
            <div className="mt-auto pt-1">
              <span className={cfg.badge}>
                <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot, cfg.active && 'animate-pulse')} />
                {cfg.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
