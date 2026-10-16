'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { ESTADO_META } from '@/lib/capacidad/carniceria'
import type { HistoricoRow } from '@/lib/capacidad/service'

const COLOR_CAP = '#D8D4C8'

function fechaCorta(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: HistoricoRow }[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const meta = ESTADO_META[r.estado]
  const deficit = r.holguraKgMP < 0
  return (
    <div className="rounded-lg border border-border-dark bg-card-dark px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-ink mb-1">{r.fecha}</p>
      <p className="text-muted">Capacidad: <span className="text-ink font-medium">{r.capacidadKgMP.toLocaleString('es-CL')} kg</span></p>
      <p className="text-muted">Pedido: <span className="font-medium" style={{ color: meta.color }}>{r.pedidoKgMP.toLocaleString('es-CL')} kg</span></p>
      <p className="text-muted">Ocupación: <span className="font-medium" style={{ color: meta.color }}>{r.ocupacionPorc}%</span></p>
      <p className="text-muted">{deficit ? 'Déficit' : 'Holgura'}: <span className={deficit ? 'text-pulse-red font-medium' : 'text-status-ok font-medium'}>{deficit ? '' : '+'}{r.holguraKgMP.toLocaleString('es-CL')} kg</span></p>
    </div>
  )
}

export function CapacidadHistChart({ rows }: { rows: HistoricoRow[] }) {
  const data = rows.map((r) => ({ ...r, label: fechaCorta(r.fecha) }))
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 8 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D7" vertical={false} />
        <XAxis dataKey="label" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D8D4C8' }} interval="preserveStartEnd" />
        <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D8D4C8' }} tickFormatter={(v) => `${(v / 1000).toLocaleString('es-CL')}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280' }} iconType="square" />
        <Bar dataKey="capacidadKgMP" name="Capacidad" fill={COLOR_CAP} stroke="#D8D4C8" radius={[2, 2, 0, 0]} maxBarSize={26} />
        <Bar dataKey="pedidoKgMP" name="Pedido" radius={[2, 2, 0, 0]} maxBarSize={26}>
          {data.map((r, i) => <Cell key={i} fill={ESTADO_META[r.estado].color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
