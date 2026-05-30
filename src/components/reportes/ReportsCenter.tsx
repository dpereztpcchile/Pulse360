'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Factory, Package, Truck, AlertTriangle, Gauge, Calendar, ArrowRight, LucideIcon } from 'lucide-react'

interface ReportCard {
  slug: string
  nombre: string
  descripcion: string
  icon: LucideIcon
  roles: string[]
}

const REPORTS: ReportCard[] = [
  { slug: 'produccion',        nombre: 'Producción',         descripcion: 'Producción real vs plan, OEE por línea, paradas y horas productivas.', icon: Factory,       roles: ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'] },
  { slug: 'materias-primas',   nombre: 'Materias Primas',    descripcion: 'Consumo por insumo, evolución de stock, proveedores y lotes por vencer.', icon: Package,       roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  { slug: 'despacho',          nombre: 'Despacho',           descripcion: 'Volumen despachado, cumplimiento a tiempo y ranking de clientes.',     icon: Truck,         roles: ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'] },
  { slug: 'no-conformidades',  nombre: 'No Conformidades',   descripcion: 'NC creadas/cerradas/vencidas, categorías, gravedad y tiempos por área.', icon: AlertTriangle, roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  { slug: 'capacidad',         nombre: 'Capacidad vs Demanda', descripcion: 'Ocupación por línea y capacidad vs demanda semana a semana.',          icon: Gauge,         roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
]

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function ReportsCenter({ role }: { role: string }) {
  const router = useRouter()
  const [from, setFrom] = useState(isoDaysAgo(29))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))

  const visible = REPORTS.filter((r) => r.roles.includes(role))

  const generate = (slug: string) => {
    router.push(`/reportes/${slug}?from=${from}&to=${to}`)
  }

  return (
    <div className="space-y-6">
      {/* Selector global de rango */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex items-center gap-2 text-sm text-[#999]">
          <Calendar className="w-4 h-4 text-pulse-red" />
          <span className="font-medium">Rango de fechas</span>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Desde
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:border-pulse-red outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Hasta
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="bg-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:border-pulse-red outline-none"
            />
          </label>
        </div>
        <p className="text-xs text-[#666] sm:ml-auto">El rango se aplica a todos los reportes.</p>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(({ slug, nombre, descripcion, icon: Icon }) => (
          <div key={slug} className="card flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-pulse-red/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-pulse-red" />
                </div>
                <h3 className="font-semibold text-white">{nombre}</h3>
              </div>
              <p className="text-sm text-[#666]">{descripcion}</p>
            </div>
            <button onClick={() => generate(slug)} className="btn-primary text-sm justify-center flex items-center gap-2">
              Generar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
