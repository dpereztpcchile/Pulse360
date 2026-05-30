'use client'

import { useState } from 'react'
import { Loader2, Save, AlertCircle, CheckCircle2, Factory } from 'lucide-react'
import { cn, weeklyCapacityKg, CAPACITY_DAYS_PER_WEEK } from '@/lib/utils'

interface Row {
  lineId: string
  lineName: string
  lineCode: string
  configured: boolean
  kgPerHour: number
  hoursPerShift: number
  activeShifts: number
  efficiency: number
  weeklyCapacityKg: number
}

export function ConfigClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function update(lineId: string, field: keyof Row, value: string) {
    const n = value === '' ? 0 : Number(value)
    if (Number.isNaN(n)) return
    setRows((prev) => prev.map((r) => (r.lineId === lineId ? { ...r, [field]: n } : r)))
    setSavedId(null)
  }

  async function save(row: Row) {
    setSavingId(row.lineId); setError(''); setSavedId(null)
    try {
      const res = await fetch('/api/capacity/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: row.lineId,
          kgPerHour: row.kgPerHour,
          hoursPerShift: row.hoursPerShift,
          activeShifts: row.activeShifts,
          efficiency: row.efficiency,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setRows((prev) => prev.map((r) => (r.lineId === row.lineId ? { ...r, configured: true } : r)))
      setSavedId(row.lineId)
    } catch { setError('Error de conexión') } finally { setSavingId(null) }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red'
  const labelCls = 'block text-xs font-medium text-[#888] mb-1'

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {rows.length === 0 && (
        <div className="card text-center py-12 text-[#555] text-sm">No hay líneas de producción registradas</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {rows.map((r) => {
          const weekly = Math.round(weeklyCapacityKg(r.kgPerHour, r.hoursPerShift, r.activeShifts, r.efficiency))
          const daily = Math.round(weekly / CAPACITY_DAYS_PER_WEEK)
          return (
            <div key={r.lineId} className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-border-dark/50"><Factory className="w-4 h-4 text-[#999]" /></div>
                  <div>
                    <p className="font-semibold text-white">{r.lineName}</p>
                    <p className="text-xs text-[#666] font-mono">{r.lineCode}</p>
                  </div>
                </div>
                {!r.configured && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-status-warn/10 text-status-warn border border-status-warn/20">
                    Sin configurar
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Capacidad (kg/hora)</label>
                  <input type="number" min={0} value={r.kgPerHour || ''} onChange={(e) => update(r.lineId, 'kgPerHour', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Horas por turno</label>
                  <input type="number" min={0} max={24} value={r.hoursPerShift || ''} onChange={(e) => update(r.lineId, 'hoursPerShift', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Turnos activos</label>
                  <select value={r.activeShifts} onChange={(e) => update(r.lineId, 'activeShifts', e.target.value)} className={inputCls}>
                    {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'turno' : 'turnos'}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Eficiencia esperada (%)</label>
                  <input type="number" min={0} max={100} value={r.efficiency || ''} onChange={(e) => update(r.lineId, 'efficiency', e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Cálculo automático */}
              <div className="flex items-center justify-between rounded-lg bg-bg-dark border border-border-dark px-4 py-3">
                <div>
                  <p className="text-xs text-[#666] uppercase tracking-wide">Capacidad total semanal</p>
                  <p className="font-rajdhani font-bold text-2xl text-white">
                    {weekly.toLocaleString('es-CL')} <span className="text-sm text-[#666] font-normal">kg/sem</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#666]">≈ {daily.toLocaleString('es-CL')} kg/día</p>
                  <p className="text-[10px] text-[#555] mt-0.5">{r.kgPerHour}×{r.hoursPerShift}h×{r.activeShifts}t×{r.efficiency}%×{CAPACITY_DAYS_PER_WEEK}d</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {savedId === r.lineId && (
                  <span className="flex items-center gap-1.5 text-sm text-status-ok">
                    <CheckCircle2 className="w-4 h-4" /> Guardado
                  </span>
                )}
                <button onClick={() => save(r)} disabled={savingId === r.lineId}
                  className={cn('btn-primary text-sm ml-auto disabled:opacity-60')}>
                  {savingId === r.lineId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
