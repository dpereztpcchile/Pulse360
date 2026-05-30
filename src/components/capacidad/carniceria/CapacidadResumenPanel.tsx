'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ESTADO_META, PRODUCTIVIDAD_NOMINAL } from '@/lib/capacidad/carniceria'
import type { CapacidadEstado } from '@prisma/client'

// Datos provenientes de getDiaView (ConfiguracionTurnos + CapacidadDiaria).
export interface CapacidadResumenData {
  diaLabel: string
  hasProgram: boolean
  capacidadKgMP: number
  pedidoKgMP: number
  ocupacionPorc: number
  holguraKgMP: number
  hhDisponibles: number
  estado: CapacidadEstado
  breakdown: { turnoNombre: string; hh: number; personas: number }[]
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

/**
 * Versión condensada de la "Vista del día" de /capacidad, reutilizable.
 * Consume exactamente los mismos datos que el módulo de Capacidad.
 */
export function CapacidadResumenPanel({ data }: { data: CapacidadResumenData }) {
  const meta = ESTADO_META[data.estado]
  const estadoLabel = meta.label.toUpperCase()
  const deficit = data.holguraKgMP < 0

  const trackMax = Math.max(110, Math.ceil(data.ocupacionPorc))
  const pos = (v: number) => `${(v / trackMax) * 100}%`
  const fillW = `${Math.min(100, (data.ocupacionPorc / trackMax) * 100)}%`

  return (
    <div className="card grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ borderLeft: `4px solid ${meta.color}` }}>
      {/* Panel izquierdo */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
            <span className="font-rajdhani font-bold text-lg" style={{ color: meta.color }}>{data.ocupacionPorc}%</span>
          </div>
          <div>
            <p className="font-rajdhani font-bold text-xl uppercase tracking-wide leading-none" style={{ color: meta.color }}>{estadoLabel}</p>
            <p className="text-xs text-[#666] mt-1">{data.diaLabel} · {data.hasProgram ? 'Pedido cargado' : 'Sin pedido cargado'}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#999]">Capacidad disponible</span>
            <span className="text-white font-medium">{fmt(data.capacidadKgMP)} kg MP</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#999]">Pedido del día</span>
            {data.hasProgram ? (
              <span className="text-white font-medium">{fmt(data.pedidoKgMP)} kg MP</span>
            ) : (
              <Link href="/carga-archivos" className="inline-flex items-center gap-1 text-pulse-red hover:text-pulse-red-hover font-medium">
                Sin programa cargado <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#999]">{deficit ? 'Déficit' : 'Holgura'}</span>
            <span className="font-semibold" style={{ color: deficit ? '#CC0000' : '#22C55E' }}>
              {deficit ? '' : '+'}{fmt(data.holguraKgMP)} kg
            </span>
          </div>
        </div>

        {/* Barra de ocupación con marcadores 90% / 100% */}
        <div>
          <div className="relative h-4 rounded-full bg-border-dark overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: fillW, backgroundColor: meta.color }} />
          </div>
          <div className="relative h-3.5 mt-0.5 text-[10px]">
            <span className="absolute -translate-x-1/2 text-status-warn" style={{ left: pos(90) }}>90%</span>
            <span className="absolute -translate-x-1/2 text-pulse-red" style={{ left: pos(100) }}>100%</span>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="lg:border-l lg:border-border-dark lg:pl-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white text-sm">Desglose de capacidad</h4>
          <Link href="/capacidad" className="text-xs text-pulse-red hover:text-pulse-red-hover whitespace-nowrap">Ver detalle →</Link>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[#999]">Productividad nominal</span>
          <span className="text-white font-medium">{PRODUCTIVIDAD_NOMINAL} Kg MP/HH</span>
        </div>

        <div className="space-y-1">
          {data.breakdown.length === 0 ? (
            <p className="text-sm text-[#555]">Sin turnos activos este día.</p>
          ) : data.breakdown.map((t) => (
            <div key={t.turnoNombre} className="flex items-center justify-between text-sm">
              <span className="text-[#999]">{t.turnoNombre} <span className="text-[#555]">({t.personas} pers.)</span></span>
              <span className="text-white font-medium">{t.hh.toLocaleString('es-CL')} HH</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-1.5 border-t border-border-dark">
            <span className="text-[#ccc] font-medium">Total</span>
            <span className="text-white font-bold">{data.hhDisponibles.toLocaleString('es-CL')} HH</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-1">
          <span className="text-[#999]">Capacidad total</span>
          <span className="text-white font-semibold">{fmt(data.capacidadKgMP)} kg MP</span>
        </div>
      </div>
    </div>
  )
}
