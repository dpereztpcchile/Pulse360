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

const COLOR_CAPACITY = '#2A2A2A'
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
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-[#999]">Capacidad: <span className="text-white font-medium">{row.capacidad.toLocaleString('es-CL')} kg</span></p>
      <p className="text-[#999]">Demanda: <span className="text-pulse-red font-medium">{row.demanda.toLocaleString('es-CL')} kg</span></p>
      <p className={row.over ? 'text-pulse-red font-semibold mt-0.5' : 'text-[#999] mt-0.5'}>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis dataKey="line" stroke="#666" fontSize={12} tickLine={false} axisLine={{ stroke: '#2A2A2A' }} />
        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={{ stroke: '#2A2A2A' }}
          tickFormatter={(v) => `${(v / 1000).toLocaleString('es-CL')}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#999' }} iconType="square" />
        <Bar dataKey="capacidad" name="Capacidad" fill={COLOR_CAPACITY} stroke="#3A3A3A" radius={[3, 3, 0, 0]} maxBarSize={48} />
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
