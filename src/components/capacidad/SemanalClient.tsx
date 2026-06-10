'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarClock, Loader2 } from 'lucide-react'

const VERDE = '#16a34a', ROJO = '#CC0000'
const DOW = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

function parseYMD(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function addDays(s: string, n: number) { const d = parseYMD(s); d.setDate(d.getDate() + n); return ymd(d) }
function mondayOf(s: string) { const d = parseYMD(s); const w = d.getDay(); d.setDate(d.getDate() + (w === 0 ? -6 : 1 - w)); return ymd(d) }
function isoWeek(s: string) {
  const d = parseYMD(s)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

interface Celda { ymd: string; opera: boolean; capacidad: number; tooltip: string }
interface LineaSem { id: string; nombre: string; tipo: string; comparteEquipo: boolean; celdas: Celda[]; totalSemana: number }
interface Data {
  matriz: { dias: { ymd: string; dia: number }[]; lineas: LineaSem[]; totalDia: number[]; totalSemana: number }
  demanda: Record<string, Record<string, number>>
}

export function SemanalClient({ today }: { today: string }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(false)

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const s = addDays(weekStart, i)
    const d = parseYMD(s)
    return { ymd: s, label: DOW[i], num: pad(d.getDate()), mes: MESES[d.getMonth()] }
  }), [weekStart])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/capacidad/semanal?desde=${dias[0].ymd}&hasta=${dias[6].ymd}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [dias])

  const week = isoWeek(weekStart)
  const dIni = parseYMD(dias[0].ymd), dFin = parseYMD(dias[6].ymd)
  const periodLabel = `Semana ${week} · ${pad(dIni.getDate())} ${MESES[dIni.getMonth()]} — ${pad(dFin.getDate())} ${MESES[dFin.getMonth()]} ${dFin.getFullYear()}`

  const lineas = data?.matriz.lineas ?? []
  const totalDia = data?.matriz.totalDia ?? new Array(7).fill(0)
  const totalSemana = data?.matriz.totalSemana ?? 0

  return (
    <div className="space-y-5">
      {/* Selector de semana */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-border-dark overflow-hidden">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-2 text-[#999] hover:text-white hover:bg-border-dark" title="Semana anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-4 py-2 text-sm font-medium text-white border-x border-border-dark whitespace-nowrap">{periodLabel}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-2 text-[#999] hover:text-white hover:bg-border-dark" title="Semana siguiente"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setWeekStart(mondayOf(today))} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-sm text-[#ccc] hover:border-pulse-red">
          <CalendarClock className="w-4 h-4 text-pulse-red" /> Ir a semana actual
        </button>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#666]" />}
        <span className="text-xs text-[#555]">Capacidad calculada desde los horarios configurados (pestaña ⚙ Horarios). Carnicería en kg de materia prima.</span>
      </div>

      {/* Tabla líneas × días */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="text-xs text-[#666] border-b border-border-dark">
              <th className="px-3 py-3 text-left font-medium sticky left-0 bg-card-dark z-10">Línea</th>
              {dias.map((d) => (
                <th key={d.ymd} className="px-2 py-3 text-center font-medium">
                  <div className="text-white">{d.label} {d.num}</div>
                  <div className="text-[10px] text-[#666]">{d.mes}</div>
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium text-white">Total semana</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-[#555]">{loading ? 'Cargando…' : 'Sin líneas configuradas'}</td></tr>
            ) : lineas.map((l) => (
              <tr key={l.id} className="border-b border-border-dark">
                <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap sticky left-0 bg-card-dark z-10">
                  {l.nombre}
                  {l.comparteEquipo && <span className="ml-1.5 text-[#f59e0b]" title="Comparte equipo con Molida/Hamburguesas/Albóndigas">⚠</span>}
                </td>
                {l.celdas.map((celda, i) => {
                  if (!celda.opera) return <td key={i} className="px-2 py-2.5 text-center text-[#444]">—</td>
                  const cap = celda.capacidad
                  const dem = data?.demanda[l.nombre]?.[celda.ymd]
                  const tieneDem = dem != null
                  const uso = tieneDem && cap > 0 ? Math.round((dem / cap) * 100) : null
                  const demColor = tieneDem ? (dem <= cap ? VERDE : ROJO) : undefined
                  const tip = `${dias[i].label} ${dias[i].num} · ${fmt(cap)} kg${celda.tooltip ? '\n' + celda.tooltip : ''}`
                  return (
                    <td key={i} className="px-2 py-2 text-center align-top" title={tip}>
                      <div className={tieneDem ? 'text-white font-semibold tabular-nums' : 'text-[#888] tabular-nums'}>{fmt(cap)}</div>
                      {tieneDem ? (
                        <>
                          <div className="text-xs tabular-nums" style={{ color: demColor }}>{fmt(dem)}</div>
                          <div className="text-[10px] text-[#777]">{uso}%</div>
                        </>
                      ) : <div className="text-[10px] text-[#555]">disp.</div>}
                    </td>
                  )
                })}
                <td className="px-3 py-2.5 text-right text-[#ccc] font-semibold tabular-nums whitespace-nowrap">{fmt(l.totalSemana)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-dark font-semibold">
              <td className="px-3 py-3 text-white sticky left-0 bg-card-dark z-10">Total día</td>
              {totalDia.map((t, i) => (
                <td key={i} className="px-2 py-3 text-center text-white tabular-nums">{t > 0 ? fmt(t) : <span className="text-[#444]">—</span>}</td>
              ))}
              <td className="px-3 py-3 text-right text-pulse-red tabular-nums whitespace-nowrap">{fmt(totalSemana)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Nota de equipo compartido */}
      {lineas.some((l) => l.comparteEquipo) && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
          <span className="shrink-0">⚠</span>
          <span>Molida, Hamburguesas y Albóndigas <b>comparten equipo</b>. Las capacidades se expresan como si cada línea operara el turno completo. <b>No sumar</b> para obtener la capacidad total.</span>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#777]">
        <span>Cada celda: <b className="text-white">capacidad</b> · <b style={{ color: VERDE }}>demanda ≤ cap</b> / <b style={{ color: ROJO }}>demanda &gt; cap</b> · % uso</span>
        <span><span className="text-[#444]">—</span> = la línea no opera ese día</span>
        <span><span className="text-[#888]">disp.</span> = sin demanda cargada (solo capacidad)</span>
      </div>
    </div>
  )
}
