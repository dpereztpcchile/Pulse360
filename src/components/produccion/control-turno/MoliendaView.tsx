'use client'

import { useState } from 'react'
import { Play, Square, Loader2, Lock } from 'lucide-react'
import { EstadoBadge, fmtHora, Kpi } from './ui'
import { BATCH_OBJETIVO_MIN } from '@/lib/control-turno/config'
import type { RegistroDTO, BatchDTO } from './types'

export interface BatchActionPayload { action?: 'iniciar' | 'terminar'; observacion?: string | null }

function BatchRow({ b, locked, busy, onAction }: { b: BatchDTO; locked: boolean; busy: boolean; onAction: (id: string, p: BatchActionPayload) => void }) {
  const [obs, setObs] = useState(b.observacion ?? '')
  const durColor = b.duracionMinutos == null ? 'text-[#ccc]' : b.duracionMinutos <= BATCH_OBJETIVO_MIN ? 'text-status-ok' : 'text-status-warn'

  return (
    <tr className="border-b border-border-dark">
      <td className="px-3 py-2.5 font-medium text-white">B{b.numeroBatch}</td>
      <td className="px-3 py-2.5 text-center">
        {b.horaInicio ? <span className="text-[#ccc]">{fmtHora(b.horaInicio)}</span> : locked ? (
          <span className="inline-flex items-center gap-1 text-xs text-[#555]"><Lock className="w-3 h-3" /> Bloqueado</span>
        ) : (
          <button onClick={() => onAction(b.id, { action: 'iniciar' })} disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-pulse-red/15 text-pulse-red text-xs font-medium hover:bg-pulse-red/25 disabled:opacity-50">
            <Play className="w-3 h-3" /> Iniciar
          </button>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {b.horaTermino ? <span className="text-[#ccc]">{fmtHora(b.horaTermino)}</span> : b.horaInicio ? (
          <button onClick={() => onAction(b.id, { action: 'terminar', observacion: obs || null })} disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-status-ok/15 text-status-ok text-xs font-medium hover:bg-status-ok/25 disabled:opacity-50">
            <Square className="w-3 h-3" /> Terminar
          </button>
        ) : <span className="text-[#555]">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right text-[#ccc]">{b.kgBatch.toLocaleString('es-CL')}</td>
      <td className={`px-3 py-2.5 text-right font-medium ${durColor}`}>
        {b.duracionMinutos != null ? `${b.duracionMinutos} / ${BATCH_OBJETIVO_MIN} min` : `— / ${BATCH_OBJETIVO_MIN} min`}
      </td>
      <td className="px-3 py-2.5">
        <input value={obs} disabled={busy} placeholder="Observación"
          onChange={(e) => setObs(e.target.value)}
          onBlur={() => { if (obs !== (b.observacion ?? '')) onAction(b.id, { observacion: obs || null }) }}
          className="w-full px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
      </td>
      <td className="px-3 py-2.5 text-center">{busy ? <Loader2 className="w-4 h-4 animate-spin text-[#666] mx-auto" /> : <EstadoBadge estado={b.estado} />}</td>
    </tr>
  )
}

function ProductoBatches({ r, busyId, onBatchAction }: { r: RegistroDTO; busyId: string | null; onBatchAction: (id: string, p: BatchActionPayload) => void }) {
  const batches = [...r.batches].sort((a, b) => a.numeroBatch - b.numeroBatch)
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
        <h4 className="font-semibold text-white">{r.productoNombre}</h4>
        <span className="text-xs text-[#666]">{batches.filter((b) => b.estado === 'COMPLETADO').length} / {batches.length} batches</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-3 py-3 font-medium">Batch</th>
              <th className="px-3 py-3 font-medium text-center">Inicio</th>
              <th className="px-3 py-3 font-medium text-center">Término</th>
              <th className="px-3 py-3 font-medium text-right">Kg</th>
              <th className="px-3 py-3 font-medium text-right">Duración</th>
              <th className="px-3 py-3 font-medium">Observación</th>
              <th className="px-3 py-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b, i) => {
              const prevDone = i === 0 || batches.slice(0, i).every((x) => x.estado === 'COMPLETADO')
              const locked = b.estado === 'PENDIENTE' && !prevDone
              return <BatchRow key={b.id} b={b} locked={locked} busy={busyId === b.id} onAction={onBatchAction} />
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MoliendaView({ registros, busyId, onBatchAction }: { registros: RegistroDTO[]; busyId: string | null; onBatchAction: (id: string, p: BatchActionPayload) => void }) {
  const allBatches = registros.flatMap((r) => r.batches)
  const total = allBatches.length
  const completados = allBatches.filter((b) => b.estado === 'COMPLETADO')
  const kgMolidos = completados.reduce((a, b) => a + b.kgBatch, 0)
  const conDur = completados.filter((b) => b.duracionMinutos != null)
  const tiempoProm = conDur.length > 0 ? conDur.reduce((a, b) => a + (b.duracionMinutos || 0), 0) / conDur.length : 0
  const enProceso = allBatches.find((b) => b.estado === 'EN_PROCESO')
  const productoActual = enProceso
    ? registros.find((r) => r.batches.some((b) => b.id === enProceso.id))?.productoNombre ?? '—'
    : '—'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Batches completados" value={`${completados.length} / ${total}`} accent />
        <Kpi label="Kg molidos hoy" value={`${Math.round(kgMolidos).toLocaleString('es-CL')} kg`} />
        <Kpi label={`Tiempo prom. (obj. ${BATCH_OBJETIVO_MIN} min)`} value={tiempoProm > 0 ? `${tiempoProm.toFixed(1)} min` : '—'} />
        <Kpi label="En proceso" value={productoActual} />
      </div>

      {registros.length === 0 ? (
        <div className="card text-center text-[#555] py-8">Sin productos de molienda cargados para este turno.</div>
      ) : registros.map((r) => <ProductoBatches key={r.id} r={r} busyId={busyId} onBatchAction={onBatchAction} />)}
    </div>
  )
}
