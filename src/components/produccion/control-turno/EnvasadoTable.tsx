'use client'

import { useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { EstadoBadge, fmtHora, Kpi } from './ui'
import type { RegistroDTO, ActionPayload } from './types'

function kgEnvasados(r: RegistroDTO, rentapacks: number | null): number {
  if (rentapacks != null && r.pesoUnitarioKg != null) return rentapacks * r.pesoUnitarioKg
  return r.kgReal ?? 0
}

function Row({ r, busy, onAction }: { r: RegistroDTO; busy: boolean; onAction: (id: string, p: ActionPayload) => void }) {
  const [rentapacks, setRentapacks] = useState(r.rentapacks?.toString() ?? '')
  const rp = rentapacks === '' ? null : Number(rentapacks)
  const env = kgEnvasados(r, rp)
  const rend = r.kgPlan > 0 ? (env / r.kgPlan) * 100 : null

  return (
    <tr className="border-b border-border-dark hover:bg-white/[0.02]">
      <td className="px-3 py-2.5 text-white">{r.productoNombre}</td>
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
      <td className="px-3 py-2.5 text-center">
        <input type="number" min="0" value={rentapacks} disabled={busy}
          onChange={(e) => setRentapacks(e.target.value)}
          onBlur={() => { if (rentapacks !== (r.rentapacks?.toString() ?? '')) onAction(r.id, { rentapacks: rp }) }}
          className="w-24 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm text-right focus:outline-none focus:border-pulse-red" />
      </td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{env > 0 ? Math.round(env).toLocaleString('es-CL') : '—'}</td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{rend != null ? `${rend.toFixed(1)}%` : '—'}</td>
      <td className="px-3 py-2.5 text-center">{busy ? <Loader2 className="w-4 h-4 animate-spin text-[#666] mx-auto" /> : <EstadoBadge estado={r.estado} />}</td>
    </tr>
  )
}

export function EnvasadoTable({ registros, busyId, onAction }: { registros: RegistroDTO[]; busyId: string | null; onAction: (id: string, p: ActionPayload) => void }) {
  const totEnv = registros.reduce((a, r) => a + kgEnvasados(r, r.rentapacks), 0)
  const totRP = registros.reduce((a, r) => a + (r.rentapacks ?? 0), 0)
  const totPlan = registros.reduce((a, r) => a + r.kgPlan, 0)
  const rendProm = totPlan > 0 ? (totEnv / totPlan) * 100 : 0
  const terminados = registros.filter((r) => r.estado === 'COMPLETADO').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Kg envasados hoy" value={`${Math.round(totEnv).toLocaleString('es-CL')} kg`} accent />
        <Kpi label="Rentapacks totales" value={totRP.toLocaleString('es-CL')} />
        <Kpi label="Rendimiento prom." value={`${rendProm.toFixed(1)}%`} />
        <Kpi label="Terminados / total" value={`${terminados} / ${registros.length}`} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="px-3 py-3 font-medium text-right">Kg plan</th>
              <th className="px-3 py-3 font-medium text-center">Inicio</th>
              <th className="px-3 py-3 font-medium text-center">Término</th>
              <th className="px-3 py-3 font-medium text-center">Rentapacks</th>
              <th className="px-3 py-3 font-medium text-right">Kg envasados</th>
              <th className="px-3 py-3 font-medium text-right">% Rend.</th>
              <th className="px-3 py-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-[#555]">Sin productos cargados para este turno.</td></tr>
            ) : registros.map((r) => <Row key={r.id} r={r} busy={busyId === r.id} onAction={onAction} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
