'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { STOP_REASONS } from '@/lib/control-turno/config'
import type { OeeView } from './OeePanel'

interface ParadaRow { motivo: string; duracionMin: string }

export function CierreTurnoModal({
  lineId, lineName, fecha, turno, user, initialParadas, onClose, onSaved,
}: {
  lineId: string
  lineName: string
  fecha: string
  turno: string
  user: string
  initialParadas: { motivo: string; duracionMin: number }[]
  onClose: () => void
  onSaved: (oee: OeeView | null) => void
}) {
  const [rows, setRows] = useState<ParadaRow[]>(
    initialParadas.length > 0
      ? initialParadas.map((p) => ({ motivo: p.motivo, duracionMin: String(p.duracionMin) }))
      : [{ motivo: STOP_REASONS[0], duracionMin: '' }],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = rows.reduce((a, r) => a + (Number(r.duracionMin) || 0), 0)

  const update = (i: number, patch: Partial<ParadaRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const add = () => setRows((rs) => [...rs, { motivo: STOP_REASONS[0], duracionMin: '' }])
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i))

  async function save() {
    setBusy(true); setError(null)
    const paradas = rows
      .filter((r) => r.motivo && Number(r.duracionMin) > 0)
      .map((r) => ({ motivo: r.motivo, duracionMin: Number(r.duracionMin) }))
    const res = await fetch('/api/control-turno/paradas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineId, fecha, turno, paradas, registradoPor: user }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'No se pudo guardar el cierre de turno.')
      setBusy(false)
      return
    }
    const d = await res.json()
    setBusy(false)
    onSaved(d.oee ?? null)
    onClose()
  }

  const inputCls = 'px-3 py-2 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg card border border-border-dark shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-white">Cierre de turno — {lineName}</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-[#666] mb-4">Registra las paradas ocurridas durante el turno. El OEE se recalcula al guardar.</p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={r.motivo} onChange={(e) => update(i, { motivo: e.target.value })} className={`${inputCls} flex-1`}>
                {STOP_REASONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" min="0" value={r.duracionMin} onChange={(e) => update(i, { duracionMin: e.target.value })}
                placeholder="min" className={`${inputCls} w-24 text-right`} />
              <button onClick={() => remove(i)} className="p-2 text-[#666] hover:text-pulse-red"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <button onClick={add} className="mt-3 inline-flex items-center gap-1.5 text-sm text-pulse-red hover:text-pulse-red-hover">
          <Plus className="w-4 h-4" /> Agregar parada
        </button>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dark">
          <span className="text-sm text-[#999]">Total tiempo perdido</span>
          <span className="text-lg font-bold text-white">{total} min</span>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
          <button onClick={save} disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar y recalcular OEE'}
          </button>
        </div>
      </div>
    </div>
  )
}
