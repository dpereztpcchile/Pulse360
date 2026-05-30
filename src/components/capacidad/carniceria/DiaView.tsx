import Link from 'next/link'
import { Users, Gauge, Boxes, ArrowUpRight, CalendarOff } from 'lucide-react'
import { ESTADO_META, PRODUCTIVIDAD_NOMINAL } from '@/lib/capacidad/carniceria'
import { SinProgramaBanner } from '@/components/carga-programa/SinProgramaBanner'
import type { DiaView as DiaViewData } from '@/lib/capacidad/service'

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

export function DiaView({ data }: { data: DiaViewData }) {
  if (data.esDomingo) {
    return (
      <div className="card text-center py-12">
        <CalendarOff className="w-10 h-10 text-[#444] mx-auto mb-3" />
        <p className="text-white font-semibold">Domingo — sin operación programada</p>
        <p className="text-sm text-[#666] mt-1">La carnicería no trabaja los domingos.</p>
      </div>
    )
  }

  const meta = ESTADO_META[data.estado]
  const semaforoLabel = data.estado === 'HOLGURA' ? 'HOLGURA' : data.estado === 'ALERTA' ? 'ALERTA' : 'ESTRÉS'
  const trackMax = Math.max(110, Math.ceil(data.ocupacionPorc))
  const pos = (v: number) => `${(v / trackMax) * 100}%`
  const fillW = `${Math.min(100, (data.ocupacionPorc / trackMax) * 100)}%`
  const deficit = data.holguraKgMP < 0

  return (
    <div className="space-y-5">
      {!data.hasProgram && <SinProgramaBanner mensaje="Sin programa para hoy — la capacidad muestra solo la disponibilidad" />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Columna principal */}
      <div className="lg:col-span-2 space-y-5">
        {/* Semáforo */}
        <div className="card flex items-center gap-5" style={{ borderLeft: `4px solid ${meta.color}` }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
            <span className="text-3xl font-bold" style={{ color: meta.color }}>{data.ocupacionPorc}%</span>
          </div>
          <div>
            <p className="text-xs text-[#666] uppercase tracking-wider mb-0.5">Estado de ocupación</p>
            <p className="text-3xl font-bold" style={{ color: meta.color }}>{semaforoLabel}</p>
            <p className="text-sm text-[#999] mt-0.5">
              {data.diaLabel} · {data.hasProgram ? `${fmt(data.pedidoKgMP)} kg MP pedidos de ${fmt(data.capacidadKgMP)} disponibles` : 'Sin pedido cargado'}
            </p>
          </div>
        </div>

        {/* Datos + barra */}
        <div className="card">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-xs text-[#666] mb-1">Capacidad disponible</p>
              <p className="text-xl font-bold text-white">{fmt(data.capacidadKgMP)} <span className="text-sm font-normal text-[#666]">kg MP</span></p>
            </div>
            <div>
              <p className="text-xs text-[#666] mb-1">Pedido del día</p>
              {data.hasProgram ? (
                <p className="text-xl font-bold text-white">{fmt(data.pedidoKgMP)} <span className="text-sm font-normal text-[#666]">kg MP</span></p>
              ) : (
                <Link href="/produccion/control-turno/CARNICERIA" className="inline-flex items-center gap-1 text-sm text-pulse-red hover:text-pulse-red-hover font-medium">
                  Sin programa cargado <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            <div>
              <p className="text-xs text-[#666] mb-1">{deficit ? 'Déficit' : 'Holgura'}</p>
              <p className="text-xl font-bold" style={{ color: deficit ? '#CC0000' : '#22C55E' }}>
                {deficit ? '' : '+'}{fmt(data.holguraKgMP)} <span className="text-sm font-normal text-[#666]">kg</span>
              </p>
            </div>
          </div>

          {/* Barra de ocupación con marcadores 90% / 100% */}
          <div className="relative h-6 rounded-full bg-border-dark overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: fillW, backgroundColor: meta.color }} />
          </div>
          <div className="relative h-4 mt-0.5 text-[10px]">
            <span className="absolute -translate-x-1/2 text-status-warn" style={{ left: pos(90) }}>90%</span>
            <span className="absolute -translate-x-1/2 text-pulse-red" style={{ left: pos(100) }}>100%</span>
          </div>
        </div>
      </div>

      {/* Panel de desglose */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-white">Desglose de capacidad</h3>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pulse-red/10"><Gauge className="w-5 h-5 text-pulse-red" /></div>
          <div>
            <p className="text-xs text-[#666]">Productividad nominal</p>
            <p className="font-semibold text-white">{PRODUCTIVIDAD_NOMINAL} Kg MP/HH</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm text-[#999]"><Users className="w-4 h-4 text-[#666]" /> HH disponibles hoy</div>
          <div className="space-y-1.5">
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
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="p-2 rounded-lg bg-pulse-red/10"><Boxes className="w-5 h-5 text-pulse-red" /></div>
          <div>
            <p className="text-xs text-[#666]">Capacidad total</p>
            <p className="font-semibold text-white">{fmt(data.capacidadKgMP)} kg MP</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
