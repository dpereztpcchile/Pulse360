'use client'

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  AreaChart, Area,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
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
const fmtMoney = (v: unknown) => `$${Math.round(Number(v)).toLocaleString('es-CL')}`

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
export function BrandDonut({ data, colors, height = 280 }: {
  data: { name: string; value: number }[]
  /** Paleta explícita, en el mismo orden que `data`. Si no se pasa, cicla BRAND_PALETTE. */
  colors?: string[]
  height?: number
}) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-[#666] text-sm">Sin datos en el período</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
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
          label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
          labelLine={false}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={colors ? colors[i % colors.length] : BRAND_PALETTE[i % BRAND_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipProps} formatter={(v) => `${fmtNum(v)}`} />
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Donut con callouts externos: caja con borde mostrando $ y % en dos líneas,
// conectada al segmento mediante una línea quebrada (ej. "PARTICIPACIÓN NC").
// ═══════════════════════════════════════════════════════════
const PARTICIPACION_RADIAN = Math.PI / 180

interface ParticipacionLabelProps {
  cx: number
  cy: number
  midAngle: number
  outerRadius: number
  value: number
  percent?: number
  fill: string
}

function renderParticipacionLabel(props: unknown) {
  const { cx, cy, midAngle, outerRadius, value, percent, fill } = props as ParticipacionLabelProps
  const sin = Math.sin(-PARTICIPACION_RADIAN * midAngle)
  const cos = Math.cos(-PARTICIPACION_RADIAN * midAngle)
  const sx = cx + (outerRadius + 6) * cos
  const sy = cy + (outerRadius + 6) * sin
  const mx = cx + (outerRadius + 24) * cos
  const my = cy + (outerRadius + 24) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 22
  const ey = my
  const boxW = 96
  const boxH = 36
  const boxX = cos >= 0 ? ex : ex - boxW
  const boxY = ey - boxH / 2
  const pctLabel = `${Math.round((percent ?? 0) * 100)}%`
  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="#666666" fill="none" />
      <circle cx={sx} cy={sy} r={2.5} fill={fill} stroke="none" />
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={4} fill="#111111" stroke="#ffffff" strokeWidth={1} />
      <text x={boxX + boxW / 2} y={boxY + 15} textAnchor="middle" fill="#ffffff" fontSize={11} fontFamily="Rajdhani" fontWeight={600}>
        {fmtMoney(value)}
      </text>
      <text x={boxX + boxW / 2} y={boxY + 28} textAnchor="middle" fill="#cccccc" fontSize={11} fontFamily="Rajdhani">
        {pctLabel}
      </text>
    </g>
  )
}

export function ParticipacionDonut({ data, colors = ['#71798E', '#D9B36F'], height = 300 }: {
  data: { name: string; value: number }[]
  colors?: string[]
  height?: number
}) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-[#666] text-sm">Sin datos en el período</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 20, right: 70, left: 70, bottom: 20 }}>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="#1A1A1A"
          strokeWidth={2}
          label={renderParticipacionLabel}
          labelLine={false}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Línea con etiquetas $ sobre cada punto (ej. "MONTO GENERADO (SEMANAS)")
// ═══════════════════════════════════════════════════════════
export function MoneyLineChart({ data, xKey, yKey, color = '#CC0000', height = 260 }: {
  data: { [k: string]: string | number }[]
  xKey: string
  yKey: string
  color?: string
  height?: number
}) {
  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-[#666] text-sm">Sin datos en el período</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data as never[]} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmtMoney(v)} width={70} />
        <Tooltip {...tooltipProps} formatter={(v) => fmtMoney(v)} />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 0 }}>
          <LabelList dataKey={yKey} position="top" offset={10} formatter={(v: unknown) => fmtMoney(v)}
            style={{ fill: '#fff', fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 600 }} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Barras con etiquetas $ sobre cada barra (ej. "RAZON NO CONFORMIDADES")
// ═══════════════════════════════════════════════════════════
export function MoneyBars({ data, xKey, yKey, color = '#3B82F6', height = 260, angledLabels = false }: {
  data: { [k: string]: string | number }[]
  xKey: string
  yKey: string
  color?: string
  height?: number
  angledLabels?: boolean
}) {
  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-[#666] text-sm">Sin datos en el período</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data as never[]} margin={{ top: 28, right: 12, left: 0, bottom: angledLabels ? 28 : 0 }}>
        <CartesianGrid {...gridProps} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps}
          interval={0}
          angle={angledLabels ? -25 : 0}
          textAnchor={angledLabels ? 'end' : 'middle'}
          height={angledLabels ? 50 : 30}
        />
        <YAxis {...axisProps} tickFormatter={(v) => fmtMoney(v)} width={70} />
        <Tooltip {...tooltipProps} cursor={{ fill: '#ffffff08' }} formatter={(v) => fmtMoney(v)} />
        <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]}>
          <LabelList dataKey={yKey} position="top" formatter={(v: unknown) => fmtMoney(v)}
            style={{ fill: '#fff', fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Barras apiladas de N series, eje Y logarítmico (ej. "NC manejo interno
// planta (semanas)")
// ═══════════════════════════════════════════════════════════
// Cuando una semana tiene un segmento dominante (ej. $11M) junto a otras
// semanas con segmentos muy chicos (bajo $100k), una escala lineal hace que
// los valores chicos midan apenas un puñado de píxeles: sus etiquetas quedan
// amontonadas e ilegibles. La escala logarítmica resuelve esto dando espacio
// visual proporcional también a los montos pequeños.
//
// Nota técnica: una escala log no puede representar el valor 0 (log(0) es
// indefinido). Los ceros del dataset se reemplazan por un valor "piso"
// (LOG_FLOOR) ínfimo antes de graficar, de forma que esa serie simplemente
// no agregue altura visible a la barra en esa semana, en vez de romper el
// renderizado. El $0 real se sigue mostrando tal cual en la tabla de detalle.
const LOG_FLOOR = 1
const LOG_DOMAIN_MIN = 10_000

function toLogSafe(v: number) {
  return v > 0 ? v : LOG_FLOOR
}

// Las etiquetas de valor se dibujan siempre arriba de cada barra (el total),
// nunca dentro de los segmentos: con escala log la altura en píxeles de un
// segmento ya no es proporcional a su valor de forma intuitiva, así que
// poner texto dentro seguiría viéndose desordenado. El detalle por serie
// vive en la tabla que acompaña al gráfico.
function renderStackedTotalLabel(totals: Map<string, number>) {
  return function TotalLabel(props: unknown) {
    const { x, y, width, index } = props as { x?: number; y?: number; width?: number; index?: number }
    if (x == null || y == null || width == null || index == null) return null
    const total = totals.get(String(index))
    if (total == null) return null
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        fill="#fff"
        fontSize={12}
        fontFamily="Rajdhani"
        fontWeight={700}
      >
        {fmtMoney(total)}
      </text>
    )
  }
}

export function StackedBars({ data, xKey, series, height = 340 }: {
  data: { [k: string]: string | number }[]
  xKey: string
  series: { key: string; name: string; color: string }[]
  height?: number
}) {
  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-[#666] text-sm">Sin datos en el período</div>
  }

  // Dataset "seguro" para log scale (ceros → piso ínfimo) + mapa de totales
  // reales por índice de barra, usado para la etiqueta de total. El valor
  // real de cada serie (sin el piso sintético) se guarda aparte bajo
  // `__raw_<key>` para que el tooltip muestre siempre el monto verdadero
  // (incluyendo $0), nunca el piso técnico usado solo para el dibujo.
  const totalsByIndex = new Map<string, number>()
  const logData = data.map((row, i) => {
    const logRow: Record<string, string | number> = { [xKey]: row[xKey] }
    let total = 0
    for (const s of series) {
      const raw = Number(row[s.key]) || 0
      total += raw
      logRow[s.key] = toLogSafe(raw)
      logRow[`__raw_${s.key}`] = raw
    }
    totalsByIndex.set(String(i), total)
    return logRow
  })
  const maxTotal = Math.max(...Array.from(totalsByIndex.values()), LOG_DOMAIN_MIN)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={logData as never[]} margin={{ top: 28, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} interval={0} />
        <YAxis
          {...axisProps}
          scale="log"
          domain={[LOG_DOMAIN_MIN, Math.ceil(maxTotal * 1.15)]}
          allowDataOverflow
          width={70}
          tickFormatter={(v) => fmtMoney(v)}
        />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: '#ffffff08' }}
          formatter={(_v, name, props) => {
            const payload = (props as { payload?: Record<string, unknown> })?.payload
            const dataKey = (props as { dataKey?: string })?.dataKey
            const raw = payload && dataKey ? payload[`__raw_${dataKey}`] : undefined
            return [fmtMoney(raw ?? _v), name]
          }}
        />
        <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#999' }} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId="stack" fill={s.color}
            radius={i === series.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}>
            {i === series.length - 1 && (
              <LabelList dataKey={s.key} position="top" content={renderStackedTotalLabel(totalsByIndex)} />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════
// Barras horizontales compactas con valores $ (mini-cards "TOP 3 PROVEEDORES")
// ═══════════════════════════════════════════════════════════
export function MiniHorizontalBars({ data, xKey, yKey, color = '#3B82F6', height }: {
  data: { [k: string]: string | number }[]
  xKey: string
  yKey: string
  color?: string
  height?: number
}) {
  const h = height ?? Math.max(90, data.length * 28)
  if (data.length === 0) {
    return <div className="h-[90px] flex items-center justify-center text-[#666] text-xs">Sin datos</div>
  }
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data as never[]} layout="vertical" margin={{ top: 2, right: 40, left: 4, bottom: 2 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey={xKey} width={110}
          tick={{ fill: '#999', fontSize: 11, fontFamily: 'Rajdhani' }} stroke="#333333" />
        <Tooltip {...tooltipProps} cursor={{ fill: '#ffffff08' }} formatter={(v) => fmtMoney(v)} />
        <Bar dataKey={yKey} fill={color} radius={[0, 3, 3, 0]} barSize={14}>
          <LabelList dataKey={yKey} position="right" formatter={(v: unknown) => fmtMoney(v)}
            style={{ fill: '#ccc', fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
