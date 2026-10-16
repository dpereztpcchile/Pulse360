'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts'

export interface CapacityChartRow {
  line: string
  capacidad: number
  demanda: number
  pct: number
  over: boolean
}

const COLOR_CAPACITY = '#D8D4C8'
const COLOR_DEMAND = '#CC0000'
const COLOR_DEMAND_INTENSE = '#E30613'

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { payload: CapacityChartRow }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-border-dark bg-card-dark px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-ink mb-1">{label}</p>
      <p className="text-muted">Capacidad: <span className="text-ink font-medium">{row.capacidad.toLocaleString('es-CL')} kg</span></p>
      <p className="text-muted">Demanda: <span className="text-pulse-red font-medium">{row.demanda.toLocaleString('es-CL')} kg</span></p>
      <p className={row.over ? 'text-pulse-red font-semibold mt-0.5' : 'text-muted mt-0.5'}>
        Ocupación: {row.pct}%{row.over ? ' ⚠' : ''}
      </p>
    </div>
  )
}

/** Etiqueta con ícono de alerta sobre las barras de demanda sobrecargadas (>90%). */
function OverLabel(props: { x?: number; y?: number; width?: number; index?: number; data: CapacityChartRow[] }) {
  const { x = 0, y = 0, width = 0, index = 0, data } = props
  if (!data[index]?.over) return null
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill={COLOR_DEMAND_INTENSE} fontSize={14} fontWeight={700}>
      ⚠
    </text>
  )
}

export function CapacityChart({ data }: { data: CapacityChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 8 }} barGap={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D7" vertical={false} />
        <XAxis dataKey="line" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#D8D4C8' }} />
        <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#D8D4C8' }}
          tickFormatter={(v) => `${(v / 1000).toLocaleString('es-CL')}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280' }} iconType="square" />
        <Bar dataKey="capacidad" name="Capacidad" fill={COLOR_CAPACITY} stroke="#D8D4C8" radius={[3, 3, 0, 0]} maxBarSize={48} />
        <Bar dataKey="demanda" name="Demanda" radius={[3, 3, 0, 0]} maxBarSize={48}
          label={(p: object) => <OverLabel {...(p as { x?: number; y?: number; width?: number; index?: number })} data={data} />}>
          {data.map((row, i) => (
            <Cell key={i} fill={row.over ? COLOR_DEMAND_INTENSE : COLOR_DEMAND} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
