'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, ClipboardX } from 'lucide-react'
import { CarniceriaTable } from './CarniceriaTable'
import { EnvasadoTable } from './EnvasadoTable'
import { MoliendaView, type BatchActionPayload } from './MoliendaView'
import { OeePanel, type OeeView } from './OeePanel'
import { CierreTurnoModal } from './CierreTurnoModal'
import type { RegistroDTO, ActionPayload, BatchDTO } from './types'
import type { Estado } from './ui'

interface LineInfo { id: string; code: string; name: string; variant: 'CARNICERIA' | 'ENVASADO' | 'MOLIENDA'; oeeEnabled: boolean }

function estadoFromBatches(batches: BatchDTO[]): Estado {
  if (batches.length > 0 && batches.every((b) => b.estado === 'COMPLETADO')) return 'COMPLETADO'
  if (batches.some((b) => b.estado !== 'PENDIENTE')) return 'EN_PROCESO'
  return 'PENDIENTE'
}

export function LineDetailClient({
  line, fecha, turno, user, canManage, initialRegistros, initialParadas, initialOee, ncCount,
}: {
  line: LineInfo
  fecha: string
  turno: string
  user: string
  canManage: boolean
  initialRegistros: RegistroDTO[]
  initialParadas: { motivo: string; duracionMin: number }[]
  initialOee: OeeView | null
  ncCount: number
}) {
  const [registros, setRegistros] = useState<RegistroDTO[]>(initialRegistros)
  const [oee, setOee] = useState<OeeView | null>(initialOee)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [modal, setModal] = useState(false)

  async function onAction(id: string, payload: ActionPayload) {
    setBusyId(id)
    const res = await fetch(`/api/control-turno/registro/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const d = await res.json()
      const u = d.registro
      setRegistros((rs) => rs.map((r) => (r.id === id ? {
        ...r,
        estado: u.estado, horaInicio: u.horaInicio, horaTermino: u.horaTermino,
        dotacion: u.dotacion, kgReal: u.kgReal, rentapacks: u.rentapacks, observaciones: u.observaciones,
      } : r)))
      if (d.oee) setOee(d.oee)
    }
    setBusyId(null)
  }

  async function onBatchAction(batchId: string, payload: BatchActionPayload) {
    setBusyId(batchId)
    const res = await fetch(`/api/control-turno/batch/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const d = await res.json()
      const ub = d.batch
      setRegistros((rs) => rs.map((r) => {
        if (!r.batches.some((b) => b.id === batchId)) return r
        const batches = r.batches.map((b) => (b.id === batchId ? {
          ...b, estado: ub.estado, horaInicio: ub.horaInicio, horaTermino: ub.horaTermino,
          duracionMinutos: ub.duracionMinutos, observacion: ub.observacion,
        } : b))
        return { ...r, batches, estado: estadoFromBatches(batches) }
      }))
      if (d.oee) setOee(d.oee)
    }
    setBusyId(null)
  }

  const variantLabel = line.variant === 'CARNICERIA' ? 'Carnicería' : line.variant === 'MOLIENDA' ? 'Molienda (batches)' : 'Envasado'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/produccion/control-turno?turno=${turno}`} className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al resumen de turno
          </Link>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {line.name}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pulse-red/10 text-pulse-red">{variantLabel}</span>
          </h2>
        </div>
        {line.oeeEnabled && canManage && (
          <button onClick={() => setModal(true)} className="btn-secondary text-sm flex items-center gap-2">
            <ClipboardX className="w-4 h-4" /> Cierre de turno
          </button>
        )}
      </div>

      {ncCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {ncCount} no conformidad{ncCount > 1 ? 'es' : ''} registrada{ncCount > 1 ? 's' : ''} hoy para esta línea.
        </div>
      )}

      {line.variant === 'CARNICERIA' && <CarniceriaTable registros={registros} busyId={busyId} onAction={onAction} />}
      {line.variant === 'ENVASADO' && <EnvasadoTable registros={registros} busyId={busyId} onAction={onAction} />}
      {line.variant === 'MOLIENDA' && <MoliendaView registros={registros} busyId={busyId} onBatchAction={onBatchAction} />}

      {line.oeeEnabled && oee && <OeePanel data={oee} />}
      {line.oeeEnabled && !oee && (
        <div className="card text-center text-[#555] py-6 text-sm">El OEE se calculará cuando haya producción y se registre el cierre de turno.</div>
      )}

      {modal && (
        <CierreTurnoModal
          lineId={line.id} lineName={line.name} fecha={fecha} turno={turno} user={user}
          initialParadas={initialParadas}
          onClose={() => setModal(false)}
          onSaved={(o) => setOee(o)}
        />
      )}
    </div>
  )
}
