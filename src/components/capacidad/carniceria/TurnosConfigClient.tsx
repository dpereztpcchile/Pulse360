'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CheckCircle2, Users } from 'lucide-react'
import { DAY_SHORT, PRODUCTIVIDAD_NOMINAL } from '@/lib/capacidad/carniceria'

interface TurnoCfg {
  id: string
  turnoNombre: string
  cantPersonas: number
  entradas: string[]
  salidas: string[]
  hhPorDia: number[]
  colacionMin: number
  activo: boolean
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

export function TurnosConfigClient() {
  const [turnos, setTurnos] = useState<TurnoCfg[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/capacidad/turnos').then((r) => (r.ok ? r.json() : [])).then((d) => { setTurnos(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const upd = (id: string, patch: Partial<TurnoCfg>) => setTurnos((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const updHH = (id: string, day: number, value: string) =>
    setTurnos((ts) => ts.map((t) => (t.id === id ? { ...t, hhPorDia: t.hhPorDia.map((h, i) => (i === day ? Number(value) || 0 : h)) } : t)))

  // Capacidad total por día (suma de todos los turnos activos)
  const capByDay = DAY_SHORT.slice(0, 6).map((_, d) =>
    turnos.filter((t) => t.activo).reduce((a, t) => a + (t.hhPorDia[d] ?? 0) * t.cantPersonas, 0) * PRODUCTIVIDAD_NOMINAL,
  )

  async function save() {
    setBusy(true); setSaved(false)
    const res = await fetch('/api/capacidad/turnos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnos }),
    })
    if (res.ok) { setTurnos(await res.json()); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setBusy(false)
  }

  if (loading) return <div className="card flex items-center gap-2 text-sm text-[#666]"><Loader2 className="w-4 h-4 animate-spin" /> Cargando configuración…</div>
  if (turnos.length === 0) return <div className="card text-sm text-[#666]">Sin configuración de turnos. Ejecuta el seed para inicializar Carnicería.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#666]">Productividad nominal: <span className="text-white font-medium">{PRODUCTIVIDAD_NOMINAL} Kg MP/HH</span></p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-status-ok flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Guardado</span>}
          <button onClick={save} disabled={busy} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
          </button>
        </div>
      </div>

      {turnos.map((t) => (
        <div key={t.id} className="card">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pulse-red/10"><Users className="w-5 h-5 text-pulse-red" /></div>
              <div>
                <p className="font-semibold text-white">Turno {t.turnoNombre}</p>
                <p className="text-xs text-[#666]">Colación descontada</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[#999]">N° personas</span>
              <input type="number" min="0" value={t.cantPersonas} onChange={(e) => upd(t.id, { cantPersonas: Number(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-center font-bold focus:outline-none focus:border-pulse-red" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[#999]">Colación (min)</span>
              <input type="number" min="0" value={t.colacionMin} onChange={(e) => upd(t.id, { colacionMin: Number(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-center focus:outline-none focus:border-pulse-red" />
            </label>
            <label className="flex items-center gap-2 text-sm ml-auto cursor-pointer">
              <input type="checkbox" checked={t.activo} onChange={(e) => upd(t.id, { activo: e.target.checked })} className="accent-pulse-red" />
              <span className="text-[#999]">Activo</span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#666]">
                  <th className="px-2 py-1 text-left font-medium">HH/persona</th>
                  {DAY_SHORT.slice(0, 6).map((d) => <th key={d} className="px-2 py-1 font-medium">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1.5 text-[#999]">Horario</td>
                  {DAY_SHORT.slice(0, 6).map((_, i) => (
                    <td key={i} className="px-2 py-1.5 text-center text-[10px] text-[#666]">
                      {t.entradas[i] && t.salidas[i] ? `${t.entradas[i]}–${t.salidas[i]}` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-2 py-1.5 text-[#999]">HH netas</td>
                  {DAY_SHORT.slice(0, 6).map((_, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      <input type="number" min="0" step="0.5" value={t.hhPorDia[i] ?? 0} onChange={(e) => updHH(t.id, i, e.target.value)}
                        className="w-14 px-1.5 py-1 rounded bg-bg-dark border border-border-dark text-white text-center text-sm focus:outline-none focus:border-pulse-red" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Capacidad resultante por día */}
      <div className="card">
        <h4 className="font-semibold text-white mb-3">Capacidad resultante (kg MP / día)</h4>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {DAY_SHORT.slice(0, 6).map((d, i) => (
            <div key={d} className="bg-bg-dark rounded-lg p-3 text-center border border-border-dark">
              <p className="text-xs text-[#666]">{d}</p>
              <p className="font-bold text-white">{fmt(capByDay[i])}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
