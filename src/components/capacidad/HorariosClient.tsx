'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Save, X, Plus, Check, Loader2, Trash2 } from 'lucide-react'
import type { LineaConfigDTO } from '@/lib/capacidad'

const DIAS = [1, 2, 3, 4, 5, 6, 7]
const DIA_LBL: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }

const parseHora = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh + (mm || 0) / 60 }
function calcHH(opera: boolean, ingreso: string, salida: string, colacion: number): number | null {
  if (!opera || !ingreso || !salida) return null
  const v = parseHora(salida) - parseHora(ingreso) - colacion
  return v > 0 ? Math.round(v * 100) / 100 : 0
}

interface EditDia { opera: boolean; ingreso: string; salida: string; colacion: number }
interface EditTurno { nombre: string; personas: number; activo: boolean; dias: Record<number, EditDia> }
interface EditConfig { kgPorHora: number | null; kgPorHH: number | null; minsPorBatch: number | null; kgPorBatch: number | null; golpesPorMinuto: number | null; setupMin: number | null; setPointMin: number | null; formatosDia: number | null }

function toEdit(l: LineaConfigDTO): { turnos: EditTurno[]; config: EditConfig } {
  return {
    config: {
      kgPorHora: l.config?.kgPorHora ?? null, kgPorHH: l.config?.kgPorHH ?? null,
      minsPorBatch: l.config?.minsPorBatch ?? null, kgPorBatch: l.config?.kgPorBatch ?? null,
      golpesPorMinuto: l.config?.golpesPorMinuto ?? null, setupMin: l.config?.setupMin ?? null,
      setPointMin: l.config?.setPointMin ?? null, formatosDia: l.config?.formatosDia ?? null,
    },
    turnos: l.turnos.map((t) => ({
      nombre: t.nombre, personas: t.personas, activo: t.activo,
      dias: Object.fromEntries(DIAS.map((d) => {
        const h = t.horarioDias.find((x) => x.dia === d)
        return [d, { opera: h?.opera ?? false, ingreso: h?.ingreso ?? '', salida: h?.salida ?? '', colacion: h?.colacion ?? 0.5 }]
      })) as Record<number, EditDia>,
    })),
  }
}

export function HorariosClient({ lineas: initial, isAdmin }: { lineas: LineaConfigDTO[]; isAdmin: boolean }) {
  const [lineas, setLineas] = useState(initial)
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ turnos: EditTurno[]; config: EditConfig } | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function startEdit(l: LineaConfigDTO) { setEditId(l.id); setOpenId(l.id); setDraft(toEdit(l)) }
  function cancel() { setEditId(null); setDraft(null) }

  function setDia(ti: number, dia: number, patch: Partial<EditDia>) {
    setDraft((d) => {
      if (!d) return d
      const turnos = d.turnos.map((t, i) => i === ti ? { ...t, dias: { ...t.dias, [dia]: { ...t.dias[dia], ...patch } } } : t)
      return { ...d, turnos }
    })
  }
  function setTurno(ti: number, patch: Partial<Pick<EditTurno, 'nombre' | 'personas' | 'activo'>>) {
    setDraft((d) => d ? { ...d, turnos: d.turnos.map((t, i) => i === ti ? { ...t, ...patch } : t) } : d)
  }
  function addTurno() {
    setDraft((d) => d ? { ...d, turnos: [...d.turnos, { nombre: `Turno ${d.turnos.length + 1}`, personas: 1, activo: true, dias: Object.fromEntries(DIAS.map((dd) => [dd, { opera: dd <= 6, ingreso: '07:00', salida: '15:30', colacion: 0.5 }])) as Record<number, EditDia> }] } : d)
  }
  function removeTurno(ti: number) { setDraft((d) => d ? { ...d, turnos: d.turnos.filter((_, i) => i !== ti) } : d) }
  function setConfig(patch: Partial<EditConfig>) { setDraft((d) => d ? { ...d, config: { ...d.config, ...patch } } : d) }

  async function guardar(l: LineaConfigDTO) {
    if (!draft) return
    setSaving(true)
    const body = {
      productividad: draft.config,
      turnos: draft.turnos.map((t) => ({
        nombre: t.nombre, personas: t.personas, activo: t.activo,
        horarioDias: DIAS.map((d) => ({ dia: d, opera: t.dias[d].opera, ingreso: t.dias[d].ingreso, salida: t.dias[d].salida, colacion: t.dias[d].colacion })),
      })),
    }
    const res = await fetch(`/api/capacidad/config/${l.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      const { linea } = await res.json()
      if (linea) setLineas((ls) => ls.map((x) => (x.id === l.id ? linea : x)))
      setEditId(null); setDraft(null)
      setToast('✓ Horarios actualizados — capacidades recalculadas')
      setTimeout(() => setToast(null), 2500)
    } else {
      const e = await res.json().catch(() => ({}))
      setToast(e.error || 'Error al guardar')
      setTimeout(() => setToast(null), 2500)
    }
  }

  const inputCls = 'w-full px-1.5 py-1 rounded bg-bg-dark border border-border-dark text-white text-xs text-center focus:outline-none focus:border-pulse-red'

  return (
    <div className="space-y-4">
      {!isAdmin && <p className="text-xs text-[#777]">Vista de solo lectura. Solo un administrador puede editar los horarios.</p>}

      {lineas.map((l) => {
        const open = openId === l.id
        const editing = editId === l.id && draft
        const turnos = editing ? draft!.turnos : null
        return (
          <div key={l.id} className="card p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setOpenId(open ? null : l.id)}>
              <div className="flex items-center gap-2">
                {open ? <ChevronDown className="w-4 h-4 text-[#888]" /> : <ChevronRight className="w-4 h-4 text-[#666]" />}
                <span className="font-rajdhani font-bold text-lg text-white">{l.nombre}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-border-dark text-[#888]">{l.tipo}</span>
              </div>
              {isAdmin && !editing && (
                <button onClick={(e) => { e.stopPropagation(); startEdit(l) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card-dark border border-border-dark text-sm text-[#ccc] hover:border-pulse-red">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {editing && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => guardar(l)} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pulse-red text-white text-sm font-semibold hover:bg-pulse-red/90 disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
                  </button>
                  <button onClick={cancel} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card-dark border border-border-dark text-sm text-[#ccc] hover:text-white">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}
            </div>

            {open && (
              <div className="px-4 pb-4 border-t border-border-dark pt-3 space-y-4">
                {/* Productividad */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-[#888]">Productividad:</span>
                  {l.tipo === 'kg_hh' && (
                    <ConfigInput label="kg · persona · hora" value={editing ? draft!.config.kgPorHH : l.config?.kgPorHH} editing={!!editing} onChange={(v) => setConfig({ kgPorHH: v })} />
                  )}
                  {l.tipo === 'kg_hora' && (
                    <>
                      <ConfigInput label="kg / hora" value={editing ? draft!.config.kgPorHora : l.config?.kgPorHora} editing={!!editing} onChange={(v) => setConfig({ kgPorHora: v })} />
                      <span className="text-[11px] font-medium" style={{ color: '#f59e0b' }}>⚠ No escala con dotación — rendimiento fijo del equipo</span>
                    </>
                  )}
                  {l.tipo === 'batch' && (
                    <>
                      <ConfigInput label="min / batch" value={editing ? draft!.config.minsPorBatch : l.config?.minsPorBatch} editing={!!editing} onChange={(v) => setConfig({ minsPorBatch: v })} />
                      <ConfigInput label="kg / batch" value={editing ? draft!.config.kgPorBatch : l.config?.kgPorBatch} editing={!!editing} onChange={(v) => setConfig({ kgPorBatch: v })} />
                    </>
                  )}
                  {l.tipo === 'ventana' && (
                    <>
                      <ConfigInput label="kg / hora (fija, sin dotación)" value={editing ? draft!.config.kgPorHora : l.config?.kgPorHora} editing={!!editing} onChange={(v) => setConfig({ kgPorHora: v })} />
                      <span className="text-[11px] font-medium" style={{ color: '#f59e0b' }}>⚠ Comparte equipo con Molida</span>
                    </>
                  )}
                  {l.tipo === 'molida' && (
                    <>
                      <ConfigInput label="kg/hora (conjunto L1+L2)" value={editing ? draft!.config.kgPorHora : l.config?.kgPorHora} editing={!!editing} onChange={(v) => setConfig({ kgPorHora: v })} />
                      <ConfigInput label="golpes / min" value={editing ? draft!.config.golpesPorMinuto : l.config?.golpesPorMinuto} editing={!!editing} onChange={(v) => setConfig({ golpesPorMinuto: v })} />
                      <ConfigInput label="setup inicio (min)" value={editing ? draft!.config.setupMin : l.config?.setupMin} editing={!!editing} onChange={(v) => setConfig({ setupMin: v })} />
                      <ConfigInput label="set point (min)" value={editing ? draft!.config.setPointMin : l.config?.setPointMin} editing={!!editing} onChange={(v) => setConfig({ setPointMin: v })} />
                      <ConfigInput label="formatos / día" value={editing ? draft!.config.formatosDia : l.config?.formatosDia} editing={!!editing} onChange={(v) => setConfig({ formatosDia: v })} />
                    </>
                  )}
                  {l.config?.actualizadoPor && <span className="text-[11px] text-[#555] ml-auto">Última edición: {l.config.actualizadoPor}</span>}
                </div>

                {l.tipo === 'molida' && (
                  <div className="rounded-lg bg-bg-dark border border-border-dark px-3 py-2 text-xs text-[#999]">
                    <span className="text-[#888] font-semibold uppercase tracking-wide mr-2">Secuencia de producción:</span>
                    <span className="text-[#ccc]">4% → 7% → 10% grasa</span>
                    <span className="text-[#666]"> · cada formato: <b className="text-[#4ade80]">SISA 250g (L1)</b> / <b className="text-[#60a5fa]">JUMBO 500g (L2)</b> · set point {l.config?.setPointMin ?? 6} min entre cambios · setup {l.config?.setupMin ?? 30} min al inicio</span>
                  </div>
                )}

                {/* Turnos */}
                {(turnos ?? l.turnos.map((t) => ({ nombre: t.nombre, personas: t.personas, activo: t.activo, dias: Object.fromEntries(DIAS.map((d) => { const h = t.horarioDias.find((x) => x.dia === d); return [d, { opera: h?.opera ?? false, ingreso: h?.ingreso ?? '', salida: h?.salida ?? '', colacion: h?.colacion ?? 0.5 }] })) as Record<number, EditDia> }))).map((t, ti) => (
                  <div key={ti} className="rounded-lg border border-border-dark overflow-x-auto">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-bg-dark">
                      <div className="flex items-center gap-2">
                        {editing ? (
                          <input value={t.nombre} onChange={(e) => setTurno(ti, { nombre: e.target.value })} className="w-28 px-2 py-1 rounded bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                        ) : <span className="font-semibold text-white">{t.nombre}</span>}
                        {l.tipo === 'kg_hh' && <>
                          <span className="text-xs text-[#888]">—</span>
                          {editing ? (
                            <span className="flex items-center gap-1 text-xs text-[#888]"><input type="number" min={1} value={t.personas} onChange={(e) => setTurno(ti, { personas: Math.max(1, Number(e.target.value) || 1) })} className="w-14 px-1.5 py-1 rounded bg-card-dark border border-border-dark text-white text-center focus:outline-none focus:border-pulse-red" /> personas</span>
                          ) : <span className="text-xs text-[#888]">{t.personas} {t.personas === 1 ? 'persona' : 'personas'}</span>}
                        </>}
                      </div>
                      {editing && draft!.turnos.length > 1 && (
                        <button onClick={() => removeTurno(ti)} className="text-[#888] hover:text-pulse-red" title="Eliminar turno"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#666] border-b border-border-dark">
                          <th className="px-2 py-1.5 text-left font-medium w-14"></th>
                          {DIAS.map((d) => <th key={d} className="px-2 py-1.5 text-center font-medium">{DIA_LBL[d]}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Opera */}
                        {editing && (
                          <tr className="border-b border-border-dark">
                            <td className="px-2 py-1 text-[#888]">Opera</td>
                            {DIAS.map((d) => (
                              <td key={d} className="px-2 py-1 text-center">
                                <input type="checkbox" checked={t.dias[d].opera} onChange={(e) => setDia(ti, d, { opera: e.target.checked })} className="accent-pulse-red" />
                              </td>
                            ))}
                          </tr>
                        )}
                        <Row label="Ingr">{DIAS.map((d) => <Cell key={d} op={t.dias[d].opera}>{editing && t.dias[d].opera ? <input type="time" value={t.dias[d].ingreso} onChange={(e) => setDia(ti, d, { ingreso: e.target.value })} className={inputCls} /> : (t.dias[d].opera ? t.dias[d].ingreso : '—')}</Cell>)}</Row>
                        <Row label="Sal">{DIAS.map((d) => <Cell key={d} op={t.dias[d].opera}>{editing && t.dias[d].opera ? <input type="time" value={t.dias[d].salida} onChange={(e) => setDia(ti, d, { salida: e.target.value })} className={inputCls} /> : (t.dias[d].opera ? t.dias[d].salida : '—')}</Cell>)}</Row>
                        <Row label="Col">{DIAS.map((d) => <Cell key={d} op={t.dias[d].opera}>{editing && t.dias[d].opera ? <input type="number" step="0.5" min="0" value={t.dias[d].colacion} onChange={(e) => setDia(ti, d, { colacion: Number(e.target.value) || 0 })} className={inputCls} /> : (t.dias[d].opera ? t.dias[d].colacion.toFixed(1) : '—')}</Cell>)}</Row>
                        <Row label="HH">{DIAS.map((d) => { const hh = calcHH(t.dias[d].opera, t.dias[d].ingreso, t.dias[d].salida, t.dias[d].colacion); return <Cell key={d} op={t.dias[d].opera}><span className="font-semibold text-white">{hh != null ? hh : '—'}</span></Cell> })}</Row>
                      </tbody>
                    </table>
                  </div>
                ))}

                {editing && (
                  <button onClick={addTurno} className="inline-flex items-center gap-1.5 text-sm text-pulse-red hover:underline"><Plus className="w-4 h-4" /> Agregar Turno</button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold shadow-xl" style={{ background: toast.startsWith('✓') ? '#16a34a' : '#CC0000' }}>
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <tr className="border-b border-border-dark last:border-0"><td className="px-2 py-1 text-[#888]">{label}</td>{children}</tr>
}
function Cell({ op, children }: { op: boolean; children: React.ReactNode }) {
  return <td className={`px-1.5 py-1 text-center ${op ? 'text-[#ccc]' : 'text-[#444]'}`}>{children}</td>
}
function ConfigInput({ label, value, editing, onChange }: { label: string; value: number | null | undefined; editing: boolean; onChange: (v: number | null) => void }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {editing ? (
        <input type="number" min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="w-20 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm text-right focus:outline-none focus:border-pulse-red" />
      ) : <b className="text-white">{value ?? '—'}</b>}
      <span className="text-xs text-[#888]">{label}</span>
    </span>
  )
}
