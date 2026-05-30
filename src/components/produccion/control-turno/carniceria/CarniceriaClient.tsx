'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, Users, Play, Square, ChevronDown, ChevronRight } from 'lucide-react'
import { computeDerivados, prodColor } from '@/lib/control-turno/carniceria'
import { fmtHora } from '../ui'
import { SinProgramaBanner } from '@/components/carga-programa/SinProgramaBanner'

export interface CorteDTO {
  id: string; sku: string | null; nombre: string; orden: number
  kgPTPlan: number; kgMPTeorico: number; rendTeorico: number; prodObjetivo: number
  hiTeorico: string | null; htTeorico: string | null
  horaInicio: string | null; horaTermino: string | null
  kgMPReal: number | null; kgPTReal: number | null
  hhReales: number | null; prodReal: number | null; rendReal: number | null
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'
  observaciones: string | null
}
export interface ProgramaDTO {
  id: string; fecha: string; dotacion: number; turno: string; archivoNombre: string; cortes: CorteDTO[]
}

function fmt(n: number) { return Math.round(n).toLocaleString('es-CL') }
function fmt1(n: number) { return (Math.round(n * 10) / 10).toLocaleString('es-CL') }

export function CarniceriaClient({ initialPrograma, fecha, turno, user, canManage }: {
  initialPrograma: ProgramaDTO | null; fecha: string; turno: string; user: string; canManage: boolean
}) {
  void user
  const [programa, setPrograma] = useState<ProgramaDTO | null>(initialPrograma)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Detección automática del programa cargado (polling 30s mientras no haya programa)
  useEffect(() => {
    if (programa) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } return }
    const check = () => {
      fetch(`/api/control-turno/carniceria/programa?fecha=${fecha}&turno=${turno}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && d.id) setPrograma(d) })
        .catch(() => {})
    }
    pollRef.current = setInterval(check, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [programa, fecha, turno])

  async function changeDotacion(value: number) {
    if (!programa) return
    const res = await fetch('/api/control-turno/carniceria/programa', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programaId: programa.id, dotacion: value }),
    })
    if (res.ok) setPrograma(await res.json())
  }

  async function corteAction(id: string, payload: Record<string, unknown>) {
    setBusyId(id); setError(null)
    const res = await fetch(`/api/control-turno/carniceria/corte/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (res.ok) {
      const u = await res.json()
      setPrograma((p) => p ? { ...p, cortes: p.cortes.map((c) => (c.id === id ? { ...c, ...u } : c)) } : p)
    } else {
      const d = await res.json().catch(() => ({})); setError(d.error || 'Error al actualizar el corte.')
    }
    setBusyId(null)
  }

  // ── Sin programa cargado ──
  if (!programa) {
    return (
      <div className="space-y-4">
        <SinProgramaBanner mensaje="Sin programa para hoy — la carga se realiza desde Carga de Archivos" />
        <div className="card text-center py-10">
          <Users className="w-10 h-10 text-[#444] mx-auto mb-3" />
          <p className="text-white font-semibold">Esperando el programa del turno</p>
          <p className="text-sm text-[#666] mt-1">Cuando se cargue el programa del día, los cortes aparecerán aquí automáticamente.</p>
        </div>
      </div>
    )
  }

  // ── Programa cargado ──
  const cortes = programa.cortes
  const completados = cortes.filter((c) => c.estado === 'COMPLETADO')

  const sumMPTeorico = cortes.reduce((a, c) => a + c.kgMPTeorico, 0)
  const sumMPReal = completados.reduce((a, c) => a + (c.kgMPReal ?? 0), 0)
  const sumPTPlan = cortes.reduce((a, c) => a + c.kgPTPlan, 0)
  const sumPTReal = completados.reduce((a, c) => a + (c.kgPTReal ?? 0), 0)
  const sumHH = completados.reduce((a, c) => a + (c.hhReales ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Barra superior fija de dotación */}
      <div className="sticky top-0 z-10 -mx-1 px-4 py-3 rounded-lg bg-card-dark border border-border-dark flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-pulse-red" />
          <span className="text-sm text-[#999]">Dotación:</span>
          {canManage ? (
            <input type="number" min="1" defaultValue={programa.dotacion}
              onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== programa.dotacion) changeDotacion(v) }}
              className="w-16 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-base font-bold text-center focus:outline-none focus:border-pulse-red" />
          ) : <span className="text-white font-bold">{programa.dotacion}</span>}
          <span className="text-sm text-[#999]">carniceros</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Contador de cortes (discreto) */}
      <p className="font-rajdhani" style={{ color: '#888', fontSize: '13px' }}>
        Cortes terminados: {completados.length} / {cortes.length}
      </p>

      {/* Tabla de cortes */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-3 py-3 font-medium w-6"></th>
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="px-3 py-3 font-medium text-right">Pedido PT</th>
              <th className="px-3 py-3 font-medium text-right">% Rend</th>
              <th className="px-3 py-3 font-medium text-right">Kg MP teór.</th>
              <th className="px-3 py-3 font-medium text-right">Obj Kg/HH</th>
              <th className="px-3 py-3 font-medium text-center">HI teór.</th>
              <th className="px-3 py-3 font-medium text-center">Kg MP real</th>
              <th className="px-3 py-3 font-medium text-center">Kg PT real</th>
              <th className="px-3 py-3 font-medium text-center">Acción / Estado</th>
            </tr>
          </thead>
          <tbody>
            {cortes.map((c, i) => {
              const prevDone = i === 0 || cortes.slice(0, i).every((x) => x.estado === 'COMPLETADO')
              return (
                <CorteRow key={c.id} c={c} dotacion={programa.dotacion} busy={busyId === c.id} canStart={prevDone}
                  expanded={!!expanded[c.id]} onToggle={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                  onAction={corteAction} />
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-dark text-sm font-semibold">
              <td></td>
              <td className="px-3 py-3 text-white">Totales</td>
              <td className="px-3 py-3 text-right text-[#ccc]">{fmt(sumPTPlan)}</td>
              <td></td>
              <td className="px-3 py-3 text-right text-[#ccc]">{fmt(sumMPTeorico)}</td>
              <td></td>
              <td></td>
              <td className="px-3 py-3 text-center text-white">{fmt(sumMPReal)}</td>
              <td className="px-3 py-3 text-center text-white">{fmt(sumPTReal)}</td>
              <td className="px-3 py-3 text-center text-[#999]">{fmt1(sumHH)} HH</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  )
}

function CorteRow({ c, dotacion, busy, canStart, expanded, onToggle, onAction }: {
  c: CorteDTO; dotacion: number; busy: boolean; canStart: boolean; expanded: boolean
  onToggle: () => void; onAction: (id: string, p: Record<string, unknown>) => void
}) {
  const [kgMP, setKgMP] = useState(c.kgMPReal?.toString() ?? '')
  const [kgPT, setKgPT] = useState(c.kgPTReal?.toString() ?? '')
  const editable = c.estado !== 'PENDIENTE'

  const live = computeDerivados({
    horaInicio: c.horaInicio, horaTermino: c.horaTermino,
    kgMPReal: kgMP === '' ? null : Number(kgMP), kgPTReal: kgPT === '' ? null : Number(kgPT), dotacion,
  })
  const prod = live.prodReal ?? c.prodReal
  const color = prodColor(prod, c.prodObjetivo)

  const rowStyle = c.estado === 'EN_PROCESO'
    ? { backgroundColor: '#1A1200', borderLeft: '3px solid #F59E0B' }
    : c.estado === 'COMPLETADO'
      ? { backgroundColor: '#0C1A10', borderLeft: '3px solid #22C55E' }
      : { borderLeft: '3px solid transparent' }

  const inputCls = 'w-24 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm text-right focus:outline-none focus:border-pulse-red disabled:opacity-40'
  const mpReal = kgMP === '' ? null : Number(kgMP)
  const difMP = mpReal != null ? mpReal - c.kgMPTeorico : null
  const difProd = prod != null ? prod - c.prodObjetivo : null

  return (
    <>
      <tr className="border-b border-border-dark" style={rowStyle}>
        <td className="px-2 py-2.5 text-center">
          {c.estado === 'COMPLETADO' && (
            <button onClick={onToggle} className="text-[#666] hover:text-white">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </td>
        <td className="px-3 py-2.5">
          <span className="text-white">{c.nombre}</span>
          <span className="block text-xs text-[#666]">{c.sku}</span>
        </td>
        <td className="px-3 py-2.5 text-right text-[#ccc]">{fmt(c.kgPTPlan)}</td>
        <td className="px-3 py-2.5 text-right text-[#ccc]">{c.rendTeorico}%</td>
        <td className="px-3 py-2.5 text-right text-[#ccc]">{fmt(c.kgMPTeorico)}</td>
        <td className="px-3 py-2.5 text-right text-[#ccc]">{c.prodObjetivo}</td>
        <td className="px-3 py-2.5 text-center text-[#666]">{c.hiTeorico ?? '—'}</td>
        <td className="px-3 py-2.5 text-center">
          <input type="number" min="0" value={kgMP} disabled={!editable || busy} onChange={(e) => setKgMP(e.target.value)}
            onBlur={() => { if (kgMP !== (c.kgMPReal?.toString() ?? '')) onAction(c.id, { kgMPReal: kgMP === '' ? null : Number(kgMP) }) }}
            className={inputCls} />
        </td>
        <td className="px-3 py-2.5 text-center">
          <input type="number" min="0" value={kgPT} disabled={!editable || busy} onChange={(e) => setKgPT(e.target.value)}
            onBlur={() => { if (kgPT !== (c.kgPTReal?.toString() ?? '')) onAction(c.id, { kgPTReal: kgPT === '' ? null : Number(kgPT) }) }}
            className={inputCls} />
        </td>
        <td className="px-3 py-2.5 text-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin text-[#666] mx-auto" /> : c.estado === 'PENDIENTE' ? (
            <button onClick={() => onAction(c.id, { action: 'iniciar' })} disabled={!canStart}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-pulse-red/15 text-pulse-red text-xs font-medium hover:bg-pulse-red/25 disabled:opacity-40 disabled:cursor-not-allowed">
              <Play className="w-3 h-3" /> Iniciar
            </button>
          ) : c.estado === 'EN_PROCESO' ? (
            <button onClick={() => onAction(c.id, { action: 'terminar' })}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-status-ok/15 text-status-ok text-xs font-medium hover:bg-status-ok/25">
              <Square className="w-3 h-3" /> Terminar
            </button>
          ) : (
            <span className="text-xs font-medium" style={{ color }}>{fmtHora(c.horaInicio)} → {fmtHora(c.horaTermino)}</span>
          )}
        </td>
      </tr>
      {expanded && c.estado === 'COMPLETADO' && (
        <tr style={{ backgroundColor: '#0C1A10' }}>
          <td></td>
          <td colSpan={9} className="px-3 pb-3 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-bg-dark rounded-lg p-3 border border-border-dark">
              <div>
                <p className="text-[#666] mb-0.5">Productividad</p>
                <p className="text-[#ccc]">Esperada: <b className="text-white">{c.prodObjetivo} Kg/HH</b> · Real: <b style={{ color }}>{prod != null ? fmt1(prod) : '—'} Kg/HH</b></p>
                <p className="text-[#666]">Δ: {difProd != null ? `${difProd >= 0 ? '+' : ''}${fmt1(difProd)} Kg/HH` : '—'}</p>
              </div>
              <div>
                <p className="text-[#666] mb-0.5">Materia prima</p>
                <p className="text-[#ccc]">Esperado: <b className="text-white">{fmt(c.kgMPTeorico)} kg</b> · Real: <b className="text-white">{mpReal != null ? fmt(mpReal) : '—'} kg</b></p>
                <p className="text-[#666]">Δ: {difMP != null ? `${difMP >= 0 ? '+' : ''}${fmt(difMP)} kg` : '—'}</p>
              </div>
              <div>
                <p className="text-[#666] mb-0.5">Tiempo</p>
                <p className="text-[#ccc]">Esperado: <b className="text-white">{c.hiTeorico ?? '—'} → {c.htTeorico ?? '—'}</b></p>
                <p className="text-[#ccc]">Real: <b className="text-white">{fmtHora(c.horaInicio)} → {fmtHora(c.horaTermino)}</b> · {c.hhReales != null ? `${fmt1(c.hhReales)} HH` : '—'}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

