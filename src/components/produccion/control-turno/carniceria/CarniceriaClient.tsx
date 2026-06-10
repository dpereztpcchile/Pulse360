'use client'

import { useState, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, AlertCircle, Users, Play, Square, GripVertical, AlertTriangle, Plus, X } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { computeDerivados } from '@/lib/control-turno/carniceria'
import { SinProgramaBanner } from '@/components/carga-programa/SinProgramaBanner'

export interface CorteDTO {
  id: string; sku: string | null; nombre: string; orden: number
  kgPTPlan: number; kgMPTeorico: number; rendTeorico: number; prodObjetivo: number
  hiTeorico: string | null; htTeorico: string | null
  horaInicio: string | null; horaTermino: string | null
  kgMPReal: number | null; kgPTReal: number | null; corteAlRojo: number | null
  hhReales: number | null; prodReal: number | null; rendReal: number | null
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'
  observaciones: string | null
  // Subproductos / lotes / no conforme (desktop)
  mpLote1?: number | null; mpLote2?: number | null; mpLote3?: number | null
  mpRows?: number[] | null
  corteAlRojoRows?: number[] | null
  despunte7?: number | null; despunte7Rows?: number[] | null
  despunte4?: number | null; despunte4Rows?: number[] | null
  recorteMagro?: number | null; recorteMagroRows?: number[] | null
  merma?: number | null; mermaRows?: number[] | null
  noConformeKg?: number | null; noConforme?: number | null; motivoNC?: string | null
  noConformeRows?: { kg: number; motivo: string }[] | null
}
export interface ProgramaDTO {
  id: string; fecha: string; dotacion: number; turno: string; archivoNombre: string; cortes: CorteDTO[]
}

const COLS = 15
const OBJ_PRODUCTIVIDAD = 100 // Kg·H/H objetivo universal
const VERDE = '#16a34a'
const ROJO = '#CC0000'

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-CL')
const num = (s: string) => (s === '' ? 0 : Number(s) || 0)
const sumStr = (arr: string[]) => arr.reduce((a, s) => a + num(s), 0)

const popInput = 'px-2 py-1 rounded bg-[#0f0f0f] border border-[#333] text-white text-sm focus:outline-none focus:border-pulse-red'

/** Duración HH:mm entre dos instantes ISO. */
function durHHmm(inicio: string | null, termino: string | null): string {
  if (!inicio || !termino) return '—'
  const min = Math.max(0, Math.round((new Date(termino).getTime() - new Date(inicio).getTime()) / 60000))
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Normaliza filas de un campo acumulable: existentes + 1 vacía final, mínimo 2. */
function initRows(total: number | null | undefined, rows: number[] | null | undefined): string[] {
  let base: string[] = []
  if (Array.isArray(rows) && rows.length) base = rows.map((v) => String(v))
  else if (total != null) base = [String(total)]
  if (base.length === 0 || base[base.length - 1] !== '') base.push('')
  while (base.length < 2) base.push('')
  return base
}
function initNc(total: number | null | undefined, rows: { kg: number; motivo: string }[] | null | undefined, motivo?: string | null): { kg: string; motivo: string }[] {
  let base: { kg: string; motivo: string }[] = []
  if (Array.isArray(rows) && rows.length) base = rows.map((r) => ({ kg: String(r.kg ?? ''), motivo: String(r.motivo ?? '') }))
  else if (total != null) base = [{ kg: String(total), motivo: motivo ?? '' }]
  if (base.length === 0 || base[base.length - 1].kg !== '') base.push({ kg: '', motivo: '' })
  return base
}

/** Popover anclado bajo una celda; posición fija (escapa al overflow de la tabla) + click-outside. */
function Popover({ anchorRef, open, onClose, width = 240, children }: {
  anchorRef: RefObject<HTMLElement>; open: boolean; onClose: () => void; width?: number; children: ReactNode
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRef.current) { setPos(null); return }
    const r = anchorRef.current.getBoundingClientRect()
    let left = r.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
    if (left < 8) left = 8
    let top = r.bottom + 4
    // Si no cabe abajo, abrir hacia arriba
    if (top + 240 > window.innerHeight - 8) top = Math.max(8, r.top - 244)
    setPos({ top, left })
  }, [open, anchorRef, width])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorRef])

  if (!open || !pos || typeof document === 'undefined') return null
  return createPortal(
    <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: 12, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
      {children}
    </div>,
    document.body,
  )
}

export function CarniceriaClient({ initialPrograma, fecha, turno, user, canManage }: {
  initialPrograma: ProgramaDTO | null; fecha: string; turno: string; user: string; canManage: boolean
}) {
  void user
  const [programa, setPrograma] = useState<ProgramaDTO | null>(initialPrograma)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Detección automática del programa cargado (polling mientras no haya programa)
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

  // Auto-save de un corte (sin bloquear toda la fila para campos de subproducto)
  async function corteAction(id: string, payload: Record<string, unknown>, opts?: { silent?: boolean }) {
    const isLifecycle = !opts?.silent && (payload.action === 'iniciar' || payload.action === 'terminar')
    if (isLifecycle) setBusyId(id)
    setError(null)
    const res = await fetch(`/api/control-turno/carniceria/corte/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (res.ok) {
      const u = await res.json()
      setPrograma((p) => p ? { ...p, cortes: p.cortes.map((c) => (c.id === id ? { ...c, ...u } : c)) } : p)
    } else {
      const d = await res.json().catch(() => ({})); setError(d.error || 'Error al actualizar el corte.')
    }
    if (isLifecycle) setBusyId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPrograma((p) => {
      if (!p) return p
      const oldIndex = p.cortes.findIndex((c) => c.id === active.id)
      const newIndex = p.cortes.findIndex((c) => c.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return p
      const reordered = arrayMove(p.cortes, oldIndex, newIndex).map((c, i) => ({ ...c, orden: i + 1 }))
      fetch('/api/control-turno/carniceria/reordenar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programaId: p.id, ids: reordered.map((c) => c.id) }),
      }).catch(() => {})
      return { ...p, cortes: reordered }
    })
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

  const cortes = programa.cortes
  const completados = cortes.filter((c) => c.estado === 'COMPLETADO')
  const sumMPTeorico = cortes.reduce((a, c) => a + c.kgMPTeorico, 0)
  const sumMPReal = completados.reduce((a, c) => a + (c.kgMPReal ?? 0), 0)
  const sumPTPlan = cortes.reduce((a, c) => a + c.kgPTPlan, 0)
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
        {canManage && <span className="text-xs text-[#555]">Arrastra <GripVertical className="w-3.5 h-3.5 inline -mt-0.5" /> para reordenar · clic en cada total para editar sus filas.</span>}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <p className="font-rajdhani" style={{ color: '#888', fontSize: '13px' }}>
        Cortes terminados: {completados.length} / {cortes.length}
      </p>

      {/* Tabla de cortes */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="text-left text-xs text-[#666] border-b border-border-dark">
                <th className="px-2 py-3 font-medium w-6"></th>
                <th className="px-3 py-3 font-medium">Producto</th>
                <th className="px-2 py-3 font-medium text-right">Pedido PT</th>
                <th className="px-2 py-3 font-medium text-right">% Rend</th>
                <th className="px-2 py-3 font-medium text-right">Kg MP teór.</th>
                <th className="px-2 py-3 font-medium text-center">MP Total</th>
                <th className="px-2 py-3 font-medium text-center">Corte al Rojo</th>
                <th className="px-2 py-3 font-medium text-center">Despunte 7%</th>
                <th className="px-2 py-3 font-medium text-center">Despunte 4%</th>
                <th className="px-2 py-3 font-medium text-center">Recorte Magro</th>
                <th className="px-2 py-3 font-medium text-center">Merma</th>
                <th className="px-2 py-3 font-medium text-center">No Conforme</th>
                <th className="px-2 py-3 font-medium text-right">Productividad</th>
                <th className="px-2 py-3 font-medium text-center">Balance</th>
                <th className="px-2 py-3 font-medium text-center">Proceso</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={cortes.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {cortes.map((c, i) => {
                  const prevDone = i === 0 || cortes.slice(0, i).every((x) => x.estado === 'COMPLETADO')
                  return (
                    <CorteRow key={c.id} c={c} dotacion={programa.dotacion} busy={busyId === c.id}
                      canStart={prevDone} canManage={canManage} onAction={corteAction}
                      setPoint={i < cortes.length - 1 ? cortes[i + 1] : null} />
                  )
                })}
              </SortableContext>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-dark text-sm font-semibold">
                <td></td>
                <td className="px-3 py-3 text-white">Totales</td>
                <td className="px-2 py-3 text-right text-[#ccc]">{fmt(sumPTPlan)}</td>
                <td></td>
                <td className="px-2 py-3 text-right text-[#ccc]">{fmt(sumMPTeorico)}</td>
                <td className="px-2 py-3 text-center text-white">{fmt(sumMPReal)}</td>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                <td className="px-2 py-3 text-center text-[#999]">{fmt1(sumHH)} HH</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DndContext>
    </div>
  )
}

/** Celda con popover: muestra el total y abre un editor inline al hacer clic. */
function PopoverCell({ id, openId, onToggle, onClose, total, hint, subline, width, children }: {
  id: string; openId: string | null; onToggle: (id: string) => void; onClose: () => void
  total: number; hint?: string; subline?: ReactNode; width?: number; children: ReactNode
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const open = openId === id
  return (
    <td className="px-2 py-2.5 text-center align-middle">
      <button ref={anchorRef} onClick={() => onToggle(open ? '' : id)}
        className={`font-rajdhani font-bold text-base leading-none ${open ? 'text-pulse-red' : 'text-white hover:text-pulse-red'}`}>
        {total > 0 ? fmt1(total) : '—'}
      </button>
      {subline ?? <span className="block text-[9px] text-[#666] mt-0.5">{hint ?? 'kg'}</span>}
      <Popover anchorRef={anchorRef} open={open} onClose={onClose} width={width}>{children}</Popover>
    </td>
  )
}

function CorteRow({ c, dotacion, busy, canStart, canManage, onAction, setPoint }: {
  c: CorteDTO; dotacion: number; busy: boolean; canStart: boolean; canManage: boolean
  onAction: (id: string, p: Record<string, unknown>, opts?: { silent?: boolean }) => void; setPoint: CorteDTO | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id })

  // ── MP Entregada: filas acumulables (lotes, hasta 10 — se siguen sumando sin borrar) ──
  const [mpRows, setMpRows] = useState<string[]>(() => {
    const base = Array.isArray(c.mpRows) && c.mpRows.length
      ? (c.mpRows as number[])
      : ([c.mpLote1 ?? c.kgMPReal, c.mpLote2, c.mpLote3].filter((v) => v != null) as number[])
    return initRows(null, base)
  })
  const mpTotal = sumStr(mpRows)
  function commitMpArr(arr: string[]) {
    const nums = arr.filter((s) => s !== '').map((s) => num(s))
    const total = nums.reduce((a, b) => a + b, 0)
    onAction(c.id, {
      kgMPReal: total || null, mpRows: nums,
      mpLote1: nums[0] ?? null, mpLote2: nums[1] ?? null, mpLote3: nums[2] ?? null,
    }, { silent: true })
  }
  function commitMp() { commitMpArr(mpRows) }
  function setMpVal(i: number, val: string) {
    const next = [...mpRows]; next[i] = val
    if (i === mpRows.length - 1 && val !== '' && mpRows.length < 10) next.push('')
    setMpRows(next)
  }
  function removeMp(i: number) { const next = mpRows.filter((_, j) => j !== i); const fixed = next.length ? next : ['']; setMpRows(fixed); commitMpArr(fixed) }
  // Parciales: kilos que se ingresan a la derecha y se SUMAN al total del lote (izquierda)
  const [parciales, setParciales] = useState<Record<number, string>>({})
  function addParcial(i: number) {
    const p = num(parciales[i] ?? '')
    if (p <= 0) return
    const next = [...mpRows]
    next[i] = String(Math.round((num(next[i]) + p) * 100) / 100)
    setMpRows(next)
    setParciales((prev) => ({ ...prev, [i]: '' }))
    commitMpArr(next)
  }

  // ── Corte al Rojo (acumulable) ──
  const [rojoRows, setRojoRows] = useState<string[]>(() => initRows(c.corteAlRojo, c.corteAlRojoRows))

  // ── Subproductos acumulables ──
  const [d7, setD7] = useState<string[]>(() => initRows(c.despunte7, c.despunte7Rows))
  const [d4, setD4] = useState<string[]>(() => initRows(c.despunte4, c.despunte4Rows))
  const [rm, setRm] = useState<string[]>(() => initRows(c.recorteMagro, c.recorteMagroRows))
  const [mr, setMr] = useState<string[]>(() => initRows(c.merma, c.mermaRows))
  const [nc, setNc] = useState<{ kg: string; motivo: string }[]>(() => initNc(c.noConformeKg ?? c.noConforme, c.noConformeRows, c.motivoNC))

  function commitAcc(field: string, rowsField: string, rows: string[]) {
    const total = sumStr(rows)
    onAction(c.id, { [field]: total || null, [rowsField]: rows.filter((s) => s !== '').map((s) => num(s)) }, { silent: true })
  }
  function setNcVal(i: number, key: 'kg' | 'motivo', val: string) {
    const next = nc.map((r, j) => (j === i ? { ...r, [key]: val } : r))
    if (key === 'kg' && i === nc.length - 1 && val !== '' && nc.length < 10) next.push({ kg: '', motivo: '' })
    setNc(next)
  }
  function commitNc() {
    const total = nc.reduce((a, r) => a + num(r.kg), 0)
    const rows = nc.filter((r) => r.kg !== '' || r.motivo !== '').map((r) => ({ kg: num(r.kg), motivo: r.motivo }))
    onAction(c.id, { noConformeKg: total || null, noConformeRows: rows }, { silent: true })
  }

  // ── Popover único abierto a la vez (por fila) ──
  const [openId, setOpenId] = useState<string | null>(null)
  function commitFor(id: string) {
    if (id === 'mp') commitMp()
    else if (id === 'rojo') commitAcc('corteAlRojo', 'corteAlRojoRows', rojoRows)
    else if (id === 'd7') commitAcc('despunte7', 'despunte7Rows', d7)
    else if (id === 'd4') commitAcc('despunte4', 'despunte4Rows', d4)
    else if (id === 'rm') commitAcc('recorteMagro', 'recorteMagroRows', rm)
    else if (id === 'mr') commitAcc('merma', 'mermaRows', mr)
    else if (id === 'nc') commitNc()
  }
  function toggleOpen(next: string) {
    if (openId && openId !== next) commitFor(openId)
    setOpenId(next === '' ? null : next)
  }
  function closeOpen() { if (openId) commitFor(openId); setOpenId(null) }

  // ── Totales de salidas y balance de masas ──
  const t7 = sumStr(d7), t4 = sumStr(d4), trm = sumStr(rm), tmr = sumStr(mr)
  const tnc = nc.reduce((a, r) => a + num(r.kg), 0)
  const rojoNum = sumStr(rojoRows)
  const totalSalidas = t7 + t4 + trm + tmr + tnc + rojoNum
  const balance = mpTotal > 0 ? (totalSalidas / mpTotal) * 100 : null
  const balanceColor = balance == null ? '#666' : balance >= 95 ? VERDE : ROJO
  const balanceDetalle = `Salidas: Desp7 ${fmt1(t7)} · Desp4 ${fmt1(t4)} · R.Magro ${fmt1(trm)} · Merma ${fmt1(tmr)} · NC ${fmt1(tnc)} · Rojo ${fmt1(rojoNum)} = ${fmt1(totalSalidas)} kg / MP ${fmt1(mpTotal)} kg`

  // ── Productividad (usa mpTotal como Kg MP real) ──
  const live = computeDerivados({ horaInicio: c.horaInicio, horaTermino: c.horaTermino, kgMPReal: mpTotal > 0 ? mpTotal : null, kgPTReal: null, dotacion })
  const prod = live.prodReal ?? c.prodReal
  const prodColor = prod == null ? '#999999' : prod >= OBJ_PRODUCTIVIDAD ? VERDE : ROJO

  // ── Corte al Rojo: objetivo y faltante ──
  const objetivoRojo = c.kgPTPlan * 1.05
  const faltante = rojoNum > 0 && rojoNum < objetivoRojo ? objetivoRojo - rojoNum : null

  const rowBg = c.estado === 'EN_PROCESO'
    ? { backgroundColor: '#1A1200', borderLeft: '3px solid #F59E0B' }
    : c.estado === 'COMPLETADO'
      ? { backgroundColor: '#0C1A10', borderLeft: '3px solid #22C55E' }
      : { borderLeft: '3px solid transparent' }
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, position: 'relative' as const, zIndex: isDragging ? 10 : undefined, ...rowBg }

  // Editor genérico de filas acumulables (Corte al Rojo/Despunte/Merma/Recorte)
  const rowsEditor = (label: string, rows: string[], setRows: (r: string[]) => void, commit: () => void) => {
    function setVal(i: number, val: string) {
      const next = [...rows]; next[i] = val
      if (i === rows.length - 1 && val !== '' && rows.length < 10) next.push('')
      setRows(next)
    }
    return (
      <div>
        <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">{label}</p>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
          {rows.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input type="number" min="0" value={v} onChange={(e) => setVal(i, e.target.value)} onBlur={commit} className={`w-full text-right ${popInput}`} />
              <span className="text-xs text-[#666] w-5">kg</span>
            </div>
          ))}
        </div>
        {rows.length < 10 && (
          <button onClick={() => setRows([...rows, ''])} className="mt-1.5 text-xs text-pulse-red hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar</button>
        )}
        <p className="text-xs text-[#999] mt-2 pt-2 border-t border-[#333]">Total: <b className="text-white">{fmt1(sumStr(rows))} kg</b></p>
      </div>
    )
  }

  return (
    <>
      <tr ref={setNodeRef} style={style} className="border-b border-border-dark">
        <td className="px-2 py-2.5 text-center align-middle">
          {canManage && (
            <button {...attributes} {...listeners} className="text-[#555] hover:text-white cursor-grab active:cursor-grabbing touch-none" title="Arrastrar">
              <GripVertical className="w-4 h-4" />
            </button>
          )}
        </td>
        <td className="px-3 py-2.5 align-middle">
          <span className="text-white">{c.nombre}</span>
          {c.sku && <span className="block text-xs text-[#666]">{c.sku}</span>}
        </td>
        <td className="px-2 py-2.5 text-right text-[#ccc] align-middle">{fmt(c.kgPTPlan)}</td>
        <td className="px-2 py-2.5 text-right text-[#ccc] align-middle">{c.rendTeorico}%</td>
        <td className="px-2 py-2.5 text-right text-[#ccc] align-middle">{fmt(c.kgMPTeorico)}</td>

        {/* MP Total (lotes acumulables) */}
        <PopoverCell id="mp" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={mpTotal} width={320} hint={(() => { const n = mpRows.filter((s) => s !== '').length; return n > 0 ? `${n} lote${n === 1 ? '' : 's'}` : 'editar lotes' })()}>
          <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">MP Entregada (lotes)</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {mpRows.map((v, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-6 text-xs text-[#666] shrink-0">L{i + 1}</span>
                <input type="number" min="0" value={v} onChange={(e) => setMpVal(i, e.target.value)} onBlur={commitMp} title="Total del lote"
                  className={`flex-1 min-w-0 text-right font-semibold ${popInput}`} />
                <span className="text-pulse-red text-sm shrink-0">+</span>
                <input type="number" min="0" value={parciales[i] ?? ''} placeholder="parcial"
                  onChange={(e) => setParciales((p) => ({ ...p, [i]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParcial(i) } }}
                  onBlur={() => addParcial(i)} title="Escribe un parcial y Enter para sumarlo al lote"
                  className={`w-16 min-w-0 text-right ${popInput}`} />
                {i > 0 ? (
                  <button onClick={() => removeMp(i)} className="text-[#888] hover:text-pulse-red shrink-0" title="Eliminar lote"><X className="w-4 h-4" /></button>
                ) : <span className="w-4 shrink-0" />}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#666] mt-1.5">Escribe kilos parciales en la celda derecha y presiona Enter: se suman al total del lote.</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#333]">
            {mpRows.length < 10 ? (
              <button onClick={() => setMpRows([...mpRows, ''])} className="text-xs text-pulse-red hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Lote {mpRows.length + 1}</button>
            ) : <span />}
            <span className="text-xs text-[#999]">Total: <b className="text-white">{fmt1(mpTotal)} kg</b></span>
          </div>
        </PopoverCell>

        {/* Corte al Rojo (acumulable) */}
        <PopoverCell id="rojo" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={rojoNum}
          subline={faltante != null ? (
            <span className="flex items-center justify-center gap-1 mt-0.5 text-[10px] font-medium" style={{ color: ROJO }}>
              <AlertTriangle className="w-3 h-3" /> Falta {fmt(faltante)} kg
            </span>
          ) : undefined}>
          {rowsEditor('Corte al Rojo', rojoRows, setRojoRows, () => commitAcc('corteAlRojo', 'corteAlRojoRows', rojoRows))}
        </PopoverCell>

        {/* Subproductos acumulables */}
        <PopoverCell id="d7" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={t7}>
          {rowsEditor('Despunte 7%', d7, setD7, () => commitAcc('despunte7', 'despunte7Rows', d7))}
        </PopoverCell>
        <PopoverCell id="d4" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={t4}>
          {rowsEditor('Despunte 4%', d4, setD4, () => commitAcc('despunte4', 'despunte4Rows', d4))}
        </PopoverCell>
        <PopoverCell id="rm" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={trm}>
          {rowsEditor('Recorte Magro', rm, setRm, () => commitAcc('recorteMagro', 'recorteMagroRows', rm))}
        </PopoverCell>
        <PopoverCell id="mr" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={tmr}>
          {rowsEditor('Merma', mr, setMr, () => commitAcc('merma', 'mermaRows', mr))}
        </PopoverCell>

        {/* No Conforme */}
        <PopoverCell id="nc" openId={openId} onToggle={toggleOpen} onClose={closeOpen} total={tnc} width={300}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#d68a8a' }}>No Conforme</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {nc.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input type="number" min="0" placeholder="kg" value={r.kg} onChange={(e) => setNcVal(i, 'kg', e.target.value)} onBlur={commitNc} className={`w-16 text-right ${popInput} border-[#3a1010]`} />
                <input type="text" placeholder="Motivo" value={r.motivo} onChange={(e) => setNcVal(i, 'motivo', e.target.value)} onBlur={commitNc} className={`flex-1 ${popInput} border-[#3a1010]`} />
              </div>
            ))}
          </div>
          {nc.length < 10 && (
            <button onClick={() => setNc([...nc, { kg: '', motivo: '' }])} className="mt-1.5 text-xs text-pulse-red hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar</button>
          )}
          <p className="text-xs text-[#999] mt-2 pt-2 border-t border-[#333]">Total: <b className="text-white">{fmt1(tnc)} kg</b></p>
        </PopoverCell>

        {/* Productividad */}
        <td className="px-2 py-2.5 text-right font-semibold align-middle" style={{ color: prodColor }}>
          {prod != null ? (
            <span className="inline-flex items-center gap-1 justify-end">
              {prod < OBJ_PRODUCTIVIDAD && <AlertTriangle className="w-3.5 h-3.5" />}
              {fmt1(prod)}
            </span>
          ) : '—'}
        </td>

        {/* Balance de masas */}
        <td className="px-2 py-2.5 text-center align-middle font-semibold" style={{ color: balanceColor }} title={balanceDetalle}>
          {balance != null ? (
            <>
              <span className="whitespace-nowrap">{fmt1(balance)}% {balance >= 95 ? '✓' : '⚠️'}</span>
              <span className="block text-[9px] font-normal text-[#666] mt-0.5">{fmt1(totalSalidas)} / {fmt1(mpTotal)} kg</span>
            </>
          ) : '—'}
        </td>

        {/* Acción / Estado */}
        <td className="px-2 py-2.5 text-center align-middle">
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
            <span className="text-xs font-semibold text-status-ok" title="Duración real (HH:mm)">{durHHmm(c.horaInicio, c.horaTermino)}</span>
          )}
        </td>
      </tr>

      {/* Fila de transición Set Point entre productos */}
      {setPoint && (
        <tr className="bg-[#141418]">
          <td></td>
          <td colSpan={COLS - 1} className="px-3 py-1">
            <span className="text-xs italic text-[#777]">
              ⟲ Set Point{c.horaTermino && setPoint.horaInicio ? ` · transición ${durHHmm(c.horaTermino, setPoint.horaInicio)}` : ''}
            </span>
          </td>
        </tr>
      )}
    </>
  )
}
