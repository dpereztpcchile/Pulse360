'use client'

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const RED = '#CC0000'
const GRAY = '#666'

const tooltipStyle = {
  contentStyle: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#fff' },
  itemStyle: { color: '#ccc' },
}

/** NS semanal: línea real (rojo) vs plan (gris punteado). */
export function NsWeeklyChart({ data }: { data: { day: string; real: number; plan: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis dataKey="day" stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: '#2A2A2A' }} />
        <YAxis stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: '#2A2A2A' }}
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
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis dataKey="t" stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: '#2A2A2A' }} />
        <YAxis stroke={GRAY} fontSize={11} tickLine={false} axisLine={{ stroke: '#2A2A2A' }} tickFormatter={(v) => `${v}%`} />
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
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => `$${Number(v).toLocaleString('es-CL')}`} />
        <Bar dataKey="v" fill="#2A2A2A" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
