'use client'

import { useState } from 'react'
import { Loader2, Save, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, MONTH_NAMES } from '@/lib/utils'

interface Row {
  lineId: string
  lineName: string
  lineCode: string
  weeks: number[]
}

export function PlanClient({
  initialYear, initialMonth, initialWeeks, initialRows,
}: {
  initialYear: number
  initialMonth: number
  initialWeeks: number
  initialRows: Row[]
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [weeks, setWeeks] = useState(initialWeeks)
  const [rows, setRows] = useState<Row[]>(initialRows)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function loadMonth(y: number, m: number) {
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch(`/api/capacity/plan?year=${y}&month=${m}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al cargar'); return }
      setYear(data.year); setMonth(data.month); setWeeks(data.weeks); setRows(data.rows)
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    loadMonth(y, m)
  }

  function setCell(rowIdx: number, weekIdx: number, value: string) {
    const n = value === '' ? 0 : Math.max(0, Number(value))
    if (Number.isNaN(n)) return
    setRows((prev) => prev.map((r, i) => i === rowIdx
      ? { ...r, weeks: r.weeks.map((w, j) => (j === weekIdx ? n : w)) }
      : r))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const cells = rows.flatMap((r) => r.weeks.map((demandKg, j) => ({ lineId: r.lineId, week: j + 1, demandKg })))
      const res = await fetch('/api/capacity/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, cells }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setSaved(true)
    } catch { setError('Error de conexión') } finally { setSaving(false) }
  }

  const colTotals = Array.from({ length: weeks }, (_, j) => rows.reduce((a, r) => a + (r.weeks[j] ?? 0), 0))
  const rowTotal = (r: Row) => r.weeks.reduce((a, w) => a + w, 0)
  const grandTotal = colTotals.reduce((a, c) => a + c, 0)

  return (
    <div className="space-y-5">
      {/* Selector de mes + acción */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-card-dark border border-border-dark p-1">
          <button onClick={() => shiftMonth(-1)} disabled={loading}
            className="p-1.5 rounded-md text-[#888] hover:text-white hover:bg-border-dark transition-colors disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-white min-w-[150px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={() => shiftMonth(1)} disabled={loading}
            className="p-1.5 rounded-md text-[#888] hover:text-white hover:bg-border-dark transition-colors disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#888]" />}

        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-status-ok">
            <CheckCircle2 className="w-4 h-4" /> Plan guardado
          </span>
        )}

        <button onClick={save} disabled={saving || loading || rows.length === 0}
          className="btn-primary text-sm ml-auto disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar plan
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Matriz editable */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium sticky left-0 bg-card-dark">Línea</th>
                {Array.from({ length: weeks }, (_, j) => (
                  <th key={j} className="px-3 py-3 text-center font-medium whitespace-nowrap">Semana {j + 1}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {rows.length === 0 && (
                <tr><td colSpan={weeks + 2} className="px-4 py-10 text-center text-[#555]">Sin líneas configuradas</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.lineId} className="hover:bg-border-dark/20">
                  <td className="px-4 py-2 sticky left-0 bg-card-dark">
                    <span className="font-medium text-white">{r.lineName}</span>
                    <span className="block text-xs text-[#666] font-mono">{r.lineCode}</span>
                  </td>
                  {r.weeks.map((w, j) => (
                    <td key={j} className="px-2 py-2">
                      <input
                        type="number" min={0} value={w === 0 ? '' : w}
                        onChange={(e) => setCell(i, j, e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1.5 rounded-md bg-bg-dark border border-border-dark text-white text-sm text-right tabular-nums focus:outline-none focus:border-pulse-red"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold text-white tabular-nums">{rowTotal(r).toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border-dark bg-bg-dark/50 font-semibold">
                  <td className="px-4 py-3 text-[#ccc] sticky left-0 bg-bg-dark/50">Total</td>
                  {colTotals.map((c, j) => (
                    <td key={j} className="px-3 py-3 text-center text-white tabular-nums">{c.toLocaleString('es-CL')}</td>
                  ))}
                  <td className="px-4 py-3 text-right text-pulse-red tabular-nums">{grandTotal.toLocaleString('es-CL')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <p className="text-xs text-[#666]">Edita la demanda planificada (kg) por línea y semana. Los cambios se aplican al guardar el plan.</p>
    </div>
  )
}
