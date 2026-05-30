'use client'

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  AreaChart, Area,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// ── Estilo de marca para los gráficos de reportes ──────────────
// Tooltip fondo #111111, borde #CC0000, texto blanco, Rajdhani.
const tooltipProps = {
  contentStyle: {
    background: '#111111',
    border: '1px solid #CC0000',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'Rajdhani, sans-serif',
  },
  labelStyle: { color: '#fff', fontWeight: 600 },
  itemStyle: { color: '#fff' },
}

const axisProps = { tick: { fill: '#666666', fontSize: 12, fontFamily: 'Rajdhani' }, stroke: '#333333' }
const gridProps = { stroke: '#222222', strokeDasharray: '3 3' }

// Paleta de marca para donut / categorías
export const BRAND_PALETTE = ['#CC0000', '#E30613', '#F59E0B', '#999999', '#555555', '#22C55E']

const fmtNum = (v: unknown) => Number(v).toLocaleString('es-CL')

// ═══════════════════════════════════════════════════════════
// Línea: real vs plan (día a día)
// ═══════════════════════════════════════════════════════════
export function RealVsPlanLine({ data, xKey = 'day', unit = 'kg' }: {
  data: { [k: string]: string | number }[]
  xKey?: string
  unit?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipProps} formatter={(v) => `${fmtNum(v)} ${unit}`} />
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
        <Line type="monotone" dataKey="plan" name="Plan" stroke="#555555" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        <Line type="monotone" dataKey="real" name="Real" stroke="#CC0000" strokeWidth={2.5} dot={{ r: 2, fill: '#CC0000' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Barras: real vs plan (comparativo) — principal #CC0000, comparativo #2A2A2A
// ═══════════════════════════════════════════════════════════
export function RealVsPlanBars({ data, xKey = 'line', unit = 'kg' }: {
  data: { [k: string]: string | number }[]
  xKey?: string
  unit?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipProps} cursor={{ fill: '#ffffff08' }} formatter={(v) => `${fmtNum(v)} ${unit}`} />
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
        <Bar dataKey="plan" name="Plan" fill="#2A2A2A" radius={[3, 3, 0, 0]} />
        <Bar dataKey="real" name="Real" fill="#CC0000" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Barras simples (una serie)
// ═══════════════════════════════════════════════════════════
export function SimpleBars({ data, xKey, yKey, unit = '', highlightCritical = false }: {
  data: { [k: string]: string | number | boolean }[]
  xKey: string
  yKey: string
  unit?: string
  highlightCritical?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data as never[]} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipProps} cursor={{ fill: '#ffffff08' }} formatter={(v) => `${fmtNum(v)}${unit ? ' ' + unit : ''}`} />
        <Bar dataKey={yKey} fill="#CC0000" radius={[3, 3, 0, 0]}>
          {highlightCritical && data.map((d, i) => (
            <Cell key={i} fill={(d as { critical?: boolean }).critical ? '#CC0000' : '#555555'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Área simple (evolución de stock)
// ═══════════════════════════════════════════════════════════
export function StockArea({ data, xKey = 'week', yKey = 'stock', unit = 'kg' }: {
  data: { [k: string]: string | number }[]
  xKey?: string
  yKey?: string
  unit?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CC0000" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#CC0000" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipProps} formatter={(v) => `${fmtNum(v)} ${unit}`} />
        <Area type="monotone" dataKey={yKey} stroke="#CC0000" strokeWidth={2.5} fill="url(#stockGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Área apilada: capacidad vs demanda
// ═══════════════════════════════════════════════════════════
export function CapacityDemandArea({ data }: {
  data: { week: string; capacidad: number; demanda: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#555555" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#555555" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="demGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CC0000" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#CC0000" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipProps} formatter={(v) => `${fmtNum(v)} kg`} />
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
        <Area type="monotone" dataKey="capacidad" name="Capacidad" stroke="#888888" strokeWidth={2} fill="url(#capGrad)" />
        <Area type="monotone" dataKey="demanda" name="Demanda" stroke="#CC0000" strokeWidth={2.5} fill="url(#demGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Donut (distribución por categoría / gravedad)
// ═══════════════════════════════════════════════════════════
export function BrandDonut({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-[#666] text-sm">Sin datos en el período</div>
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          stroke="#1A1A1A"
          strokeWidth={2}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={BRAND_PALETTE[i % BRAND_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipProps} formatter={(v) => `${fmtNum(v)}`} />
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
