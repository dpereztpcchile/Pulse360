'use client'

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const RED = '#CC0000'
const GRAY = '#6B7280'
const GRID = '#E3E0D7'
const AXIS_LINE = '#D8D4C8'

const tooltipStyle = {
  contentStyle: { background: '#FFFFFF', border: '1px solid #E3E0D7', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#1E2227' },
  itemStyle: { color: '#3A4049' },
}

/** NS semanal: línea real (rojo) vs plan (gris punteado). */
export function NsWeeklyChart({ data }: { data: { day: string; real: number; plan: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="day" stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: AXIS_LINE }} />
        <YAxis stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: AXIS_LINE }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toLocaleString('es-CL')} kg`} />
        <Line type="monotone" dataKey="plan" name="Plan" stroke={GRAY} strokeWidth={2} strokeDasharray="5 4" dot={false} />
        <Line type="monotone" dataKey="real" name="Real" stroke={RED} strokeWidth={2.5} dot={{ r: 3, fill: RED }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Reproceso (%): línea temporal en rojo. */
export function ReprocesoChart({ data }: { data: { t: string; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="t" stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: AXIS_LINE }} />
        <YAxis stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: AXIS_LINE }} tickFormatter={(v) => `${v}%`} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v)}%`} />
        <Line type="monotone" dataKey="pct" name="Reproceso" stroke={RED} strokeWidth={2.5} dot={{ r: 3, fill: RED }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Mini barras grises para pérdidas estimadas. */
export function LossesMiniBars({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i: `S${i + 1}`, v }))
  return (
    <ResponsiveContainer width="100%" height={64}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => `$${Number(v).toLocaleString('es-CL')}`} />
        <Bar dataKey="v" fill="#D8D4C8" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
