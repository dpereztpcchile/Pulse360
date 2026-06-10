'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { Calendar, Download, AlertTriangle, Loader2, BarChart3 } from 'lucide-react'
import { exportExcel } from '@/lib/report-export'

const VERDE = '#16a34a', ROJO = '#CC0000', AMBAR = '#f59e0b', AZUL = '#3b82f6'

interface Grupo {
  nombre: string; kgPedido: number; kgCompletado: number
  nivelServicio: number; quiebreKg: number; razonFrecuente: string | null
}
interface OFQuiebre {
  numeroOF: string; producto: string; cantidadPlanificada: number
  cantidadCompletada: number; cumplimiento: number; razonQuiebre: string | null
}
interface Reporte {
  periodo: { desde: string; hasta: string }
  totalOF: number; kgPedido: number; kgCompletado: number; kgQuiebre: number; nivelServicio: number
  grupos: Grupo[]; ofsConQuiebre: OFQuiebre[]
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-CL')
const fmtFecha = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }
const grupoColor = (ns: number) => (ns >= 98 ? VERDE : ns >= 95 ? AMBAR : ROJO)

// Emoji alusivo a cada grupo de producto
const EMOJI: Record<string, string> = { BISTEC: '🥩', ESCALOPA: '🍖', MOLIDAS: '🍔', CUBOS: '🍲', OTROS: '📦' }
const emojiDe = (g: string) => EMOJI[g] ?? '📦'

export function ReporteQuiebreClient({ today }: { today: string }) {
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)
  const [rep, setRep] = useState<Reporte | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generar = useCallback(async (d: string, h: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/produccion/ordenes/reporte?desde=${d}&hasta=${h}`)
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al generar el reporte') }
      setRep(await res.json())
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); setRep(null) }
    setLoading(false)
  }, [])

  useEffect(() => { generar(today, today) }, [today, generar])

  // ── Cascada de pérdidas: barras desde 0; las rojas muestran SOLO los kg de quiebre ──
  type Step = { name: string; value: number; fill: string; tip: string }
  function buildSteps(r: Reporte): Step[] {
    const steps: Step[] = [{ name: 'Pedido Total', value: r.kgPedido, fill: AZUL, tip: 'Pedido Total' }]
    for (const g of r.grupos.filter((x) => x.quiebreKg > 0)) {
      const razon = g.razonFrecuente ?? g.nombre
      steps.push({ name: `${emojiDe(g.nombre)} ${razon}`, value: g.quiebreKg, fill: ROJO, tip: `${emojiDe(g.nombre)} ${g.nombre} · ${g.razonFrecuente ?? 'Sin razón registrada'}` })
    }
    steps.push({ name: 'Completado Real', value: r.kgCompletado, fill: AZUL, tip: 'Completado Real' })
    return steps
  }

  function exportar() {
    if (!rep) return
    const periodo = `${fmtFecha(rep.periodo.desde)} — ${fmtFecha(rep.periodo.hasta)}`
    const resumen = [{
      'Período': periodo,
      'Nivel de Servicio (%)': rep.nivelServicio,
      'Kg Pedido': rep.kgPedido,
      'Kg Completado': rep.kgCompletado,
      'Kg Quiebre': rep.kgQuiebre,
      'Total OF': rep.totalOF,
    }]
    const porGrupo = rep.grupos.map((g) => ({
      'Grupo': g.nombre, 'Kg Pedido': g.kgPedido, 'Kg Completado': g.kgCompletado,
      'Nivel Servicio (%)': g.nivelServicio, 'Quiebre (kg)': g.quiebreKg, 'Razón frecuente': g.razonFrecuente ?? '',
    }))
    const detalle = rep.ofsConQuiebre.map((o) => ({
      'OF': o.numeroOF, 'Producto': o.producto, 'Cant. Planificada': o.cantidadPlanificada,
      'Cant. Completada': o.cantidadCompletada, '% Cumplimiento': o.cumplimiento, 'Razón de Quiebre': o.razonQuiebre ?? '',
    }))
    exportExcel(`reporte-quiebre_${rep.periodo.desde}_${rep.periodo.hasta}`, resumen, [
      { name: 'Por Grupo', rows: porGrupo }, { name: 'OF con Quiebre', rows: detalle },
    ])
  }

  const nsOk = rep ? rep.nivelServicio >= 95 : true

  return (
    <div className="space-y-5">
      {/* Selector de rango + exportar */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-pulse-red" />
          <div>
            <label className="block text-[11px] text-[#888] mb-1">Desde</label>
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)}
              className="bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:border-pulse-red outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-[#888] mb-1">Hasta</label>
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)}
            className="bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:border-pulse-red outline-none" />
        </div>
        <button onClick={() => generar(desde, hasta)} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pulse-red text-white text-sm font-semibold hover:bg-pulse-red/90 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />} Generar Reporte
        </button>
        <button onClick={exportar} disabled={!rep}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-dark border border-border-dark text-[#ccc] text-sm font-semibold hover:border-pulse-red disabled:opacity-40">
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {rep && (
        <>
          {/* Encabezado de período */}
          <p className="text-sm text-[#999]">
            Período: <b className="text-white">{fmtFecha(rep.periodo.desde)} — {fmtFecha(rep.periodo.hasta)}</b>
            <span className="text-[#666]"> · {rep.totalOF} OF</span>
          </p>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4" style={{ borderColor: nsOk ? VERDE : ROJO, borderWidth: 1 }}>
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Nivel de Servicio Total</p>
              <p className="font-rajdhani font-bold text-4xl mt-1" style={{ color: nsOk ? VERDE : ROJO }}>{fmt1(rep.nivelServicio)}%</p>
            </div>
            <div className="card p-4">
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Kg Pedido</p>
              <p className="font-rajdhani font-bold text-4xl mt-1 text-white">{fmt(rep.kgPedido)}</p>
            </div>
            <div className="card p-4">
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Kg Completado</p>
              <p className="font-rajdhani font-bold text-4xl mt-1 text-white">{fmt(rep.kgCompletado)}</p>
            </div>
            <div className="card p-4">
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Kg Quiebre Total</p>
              <p className="font-rajdhani font-bold text-4xl mt-1" style={{ color: rep.kgQuiebre > 0 ? ROJO : VERDE }}>
                {fmt(rep.kgQuiebre)}
                <span className="text-base font-normal text-[#888] ml-2">
                  ({rep.kgPedido > 0 ? fmt1((rep.kgQuiebre / rep.kgPedido) * 100) : '0'}%)
                </span>
              </p>
            </div>
          </div>

          {/* Tabla por grupo */}
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#666] border-b border-border-dark">
                  <th className="px-4 py-3 font-medium">Grupo</th>
                  <th className="px-4 py-3 font-medium text-right">Kg Pedido</th>
                  <th className="px-4 py-3 font-medium text-right">Kg Completado</th>
                  <th className="px-4 py-3 font-medium text-right">Nivel Servicio</th>
                  <th className="px-4 py-3 font-medium text-right">Quiebre (kg)</th>
                  <th className="px-4 py-3 font-medium">Razón frecuente</th>
                </tr>
              </thead>
              <tbody>
                {rep.grupos.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#555]">Sin OF en el período</td></tr>
                ) : rep.grupos.map((g) => {
                  const col = grupoColor(g.nivelServicio)
                  return (
                    <tr key={g.nombre} className="border-b border-border-dark" style={{ borderLeft: `3px solid ${col}` }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: col }}><span className="mr-1.5">{emojiDe(g.nombre)}</span>{g.nombre}</td>
                      <td className="px-4 py-2.5 text-right text-[#ccc]">{fmt(g.kgPedido)}</td>
                      <td className="px-4 py-2.5 text-right text-[#ccc]">{fmt(g.kgCompletado)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: col }}>{fmt1(g.nivelServicio)}%</td>
                      <td className="px-4 py-2.5 text-right" style={{ color: g.quiebreKg > 0 ? ROJO : '#888' }}>{fmt1(g.quiebreKg)}</td>
                      <td className="px-4 py-2.5 text-[#999] text-xs">{g.razonFrecuente ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cascada de pérdidas */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-1">Cascada de Pérdidas (Fill Rate)</h3>
            <p className="text-xs text-[#666] mb-4">Pedido vs Completado acumulado del período · las barras rojas muestran solo los kg de quiebre por razón</p>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={buildSteps(rep)} margin={{ top: 24, right: 12, left: 4, bottom: 84 }}>
                <CartesianGrid stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#ccc', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={100} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} domain={[0, 'dataMax']} tickFormatter={(v) => fmt(Number(v))} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
                  formatter={(v, _n, p) => [`${fmt1(Number(v))} kg`, (p?.payload as Step)?.tip ?? '']}
                />
                <Bar dataKey="value" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {buildSteps(rep).map((s, i) => <Cell key={i} fill={s.fill} />)}
                  <LabelList dataKey="value" position="top" formatter={(v) => fmt(Number(v ?? 0))} style={{ fill: '#fff', fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detalle OF con quiebre */}
          <div className="card p-0 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide px-4 pt-4 pb-2">OF con Quiebre (&lt; 95%)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#666] border-b border-border-dark">
                  <th className="px-4 py-3 font-medium">OF</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium text-right">Cant. Planificada</th>
                  <th className="px-4 py-3 font-medium text-right">Cant. Completada</th>
                  <th className="px-4 py-3 font-medium text-right">% Cumplimiento</th>
                  <th className="px-4 py-3 font-medium">Razón de Quiebre</th>
                </tr>
              </thead>
              <tbody>
                {rep.ofsConQuiebre.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#16a34a]">✓ Sin quiebres en el período</td></tr>
                ) : rep.ofsConQuiebre.map((o) => (
                  <tr key={o.numeroOF} className="border-b border-border-dark">
                    <td className="px-4 py-2.5 text-white font-medium whitespace-nowrap">{o.numeroOF}</td>
                    <td className="px-4 py-2.5 text-[#ccc]">{o.producto}</td>
                    <td className="px-4 py-2.5 text-right text-[#ccc]">{fmt(o.cantidadPlanificada)}</td>
                    <td className="px-4 py-2.5 text-right text-[#ccc]">{fmt(o.cantidadCompletada)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: ROJO }}>
                      <span className="inline-flex items-center gap-1 justify-end"><AlertTriangle className="w-3.5 h-3.5" />{fmt1(o.cumplimiento)}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#999] text-xs">{o.razonQuiebre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && !rep && (
        <div className="card flex items-center justify-center py-16 text-[#666]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Generando reporte…
        </div>
      )}
    </div>
  )
}
