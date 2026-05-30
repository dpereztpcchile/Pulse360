'use client'

import { useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { EstadoBadge, fmtHora, horasTrabajadas, Kpi } from './ui'
import type { RegistroDTO, ActionPayload } from './types'

function kgMP(r: RegistroDTO): number {
  if (!r.rendTeoricoPorc || r.rendTeoricoPorc <= 0) return 0
  return r.kgPlan / (r.rendTeoricoPorc / 100)
}
function rendimientoPct(r: RegistroDTO): number | null {
  const mp = kgMP(r)
  if (mp <= 0 || r.kgReal == null) return null
  return (r.kgReal / mp) * 100
}

function Row({ r, busy, onAction }: { r: RegistroDTO; busy: boolean; onAction: (id: string, p: ActionPayload) => void }) {
  const [dotacion, setDotacion] = useState(r.dotacion?.toString() ?? '')
  const [kgReal, setKgReal] = useState(r.kgReal?.toString() ?? '')
  const hh = horasTrabajadas(r.horaInicio, r.horaTermino, Number(dotacion) || r.dotacion)
  const kgHH = hh > 0 && r.kgReal != null ? r.kgReal / hh : null
  const rend = rendimientoPct(r)
  const inputCls = 'w-20 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm text-right focus:outline-none focus:border-pulse-red'

  return (
    <tr className="border-b border-border-dark hover:bg-white/[0.02]">
      <td className="px-3 py-2.5 text-white">{r.productoNombre}</td>
      <td className="px-3 py-2.5 text-center">
        <input type="number" min="0" value={dotacion} disabled={busy}
          onChange={(e) => setDotacion(e.target.value)}
          onBlur={() => { if (dotacion !== (r.dotacion?.toString() ?? '')) onAction(r.id, { dotacion: dotacion === '' ? null : Number(dotacion) }) }}
          className="w-16 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm text-center focus:outline-none focus:border-pulse-red" />
      </td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{r.kgPlan.toLocaleString('es-CL')}</td>
      <td className="px-3 py-2.5 text-center">
        {r.horaInicio ? <span className="text-[#ccc]">{fmtHora(r.horaInicio)}</span> : (
          <button onClick={() => onAction(r.id, { action: 'iniciar' })} disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-pulse-red/15 text-pulse-red text-xs font-medium hover:bg-pulse-red/25 disabled:opacity-50">
            <Play className="w-3 h-3" /> Iniciar
          </button>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {r.horaTermino ? <span className="text-[#ccc]">{fmtHora(r.horaTermino)}</span> : r.horaInicio ? (
          <button onClick={() => onAction(r.id, { action: 'terminar' })} disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-status-ok/15 text-status-ok text-xs font-medium hover:bg-status-ok/25 disabled:opacity-50">
            <Square className="w-3 h-3" /> Terminar
          </button>
        ) : <span className="text-[#555]">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{hh > 0 ? hh.toFixed(1) : '—'}</td>
      <td className="px-3 py-2.5 text-center">
        <input type="number" min="0" value={kgReal} disabled={busy}
          onChange={(e) => setKgReal(e.target.value)}
          onBlur={() => { if (kgReal !== (r.kgReal?.toString() ?? '')) onAction(r.id, { kgReal: kgReal === '' ? null : Number(kgReal) }) }}
          className={inputCls} />
      </td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{kgHH != null ? kgHH.toFixed(1) : '—'}</td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{rend != null ? `${rend.toFixed(1)}%` : '—'}</td>
      <td className="px-3 py-2.5 text-center">{busy ? <Loader2 className="w-4 h-4 animate-spin text-[#666] mx-auto" /> : <EstadoBadge estado={r.estado} />}</td>
    </tr>
  )
}

export function CarniceriaTable({ registros, busyId, onAction }: { registros: RegistroDTO[]; busyId: string | null; onAction: (id: string, p: ActionPayload) => void }) {
  const totKgReal = registros.reduce((a, r) => a + (r.kgReal ?? 0), 0)
  const totKgPlan = registros.reduce((a, r) => a + r.kgPlan, 0)
  const totHH = registros.reduce((a, r) => a + horasTrabajadas(r.horaInicio, r.horaTermino, r.dotacion), 0)
  const totMP = registros.reduce((a, r) => a + kgMP(r), 0)
  const prod = totHH > 0 ? totKgReal / totHH : 0
  const rendProm = totMP > 0 ? (totKgReal / totMP) * 100 : 0
  const terminados = registros.filter((r) => r.estado === 'COMPLETADO').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Kg producidos vs plan" value={`${Math.round(totKgReal).toLocaleString('es-CL')} / ${Math.round(totKgPlan).toLocaleString('es-CL')}`} accent />
        <Kpi label="Productividad (Kg/HH)" value={prod.toFixed(1)} />
        <Kpi label="Rendimiento prom." value={`${rendProm.toFixed(1)}%`} />
        <Kpi label="Terminados / total" value={`${terminados} / ${registros.length}`} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="px-3 py-3 font-medium text-center">Dotación</th>
              <th className="px-3 py-3 font-medium text-right">Kg plan</th>
              <th className="px-3 py-3 font-medium text-center">Inicio</th>
              <th className="px-3 py-3 font-medium text-center">Término</th>
              <th className="px-3 py-3 font-medium text-right">HH trab.</th>
              <th className="px-3 py-3 font-medium text-center">Kg real</th>
              <th className="px-3 py-3 font-medium text-right">Kg/HH</th>
              <th className="px-3 py-3 font-medium text-right">% Rend.</th>
              <th className="px-3 py-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-[#555]">Sin productos cargados para este turno.</td></tr>
            ) : registros.map((r) => <Row key={r.id} r={r} busy={busyId === r.id} onAction={onAction} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
