'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload, Loader2, FileSpreadsheet, Download, Check, AlertTriangle } from 'lucide-react'
import { exportPdf } from '@/lib/report-export'

const ROJO = '#CC0000', VERDE = '#16a34a', NARANJA = '#f59e0b', AMARILLO = '#eab308'
// Paleta sobria slate/teal (rojo reservado solo para "capacidad"); un color distinto por gráfico
const CARN = '#14b8a6'   // Carnicería — teal
const MOL = '#38bdf8'    // Molidas — sky
const VAR = '#64748b'    // Variedades — slate
const MIL = '#0e7490'    // Milanesas — teal profundo
const AXIS = '#94a3b8'
// Saturación: tarjetas en gris más claro para destacar del resto del módulo
const CARD = '#262932', CARD_BORDER = '#3a3e4a', PANEL = '#2f333d', GRID = '#3a3f4b'
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-CL')

function parseYMD(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function addDays(s: string, n: number) { const d = parseYMD(s); d.setDate(d.getDate() + n); return ymd(d) }
function mondayOf(s: string) { const d = parseYMD(s); const w = d.getDay(); d.setDate(d.getDate() + (w === 0 ? -6 : 1 - w)); return ymd(d) }
function isoWeek(s: string) {
  const d = parseYMD(s); const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const ys = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - ys.getTime()) / 86400000) + 1) / 7)
}

type Sat = {
  semana: string; fechaInicio: string; fechaFin: string; dias: string[]
  carniceria: { capacidad: number[]; mpRequerida: number[]; saturacion: number[]; grupos: { nombre: string; color: string; mp: number[]; pt: number[] }[] }
  molidas: { horasDisponibles: number[]; hhHamburguesas: number[]; hhAlbondigas: number[]; hhVariedades: number[]; hhMolidas: number[]; pedidoHamburguesas: number[]; pedidoAlbondigas: number[]; capacidadTotal: number[]; capacidadMolidas: number[]; pedidoMolidas: number[]; saturacion: number[]; holguraH: number[] }
  milanesas: { capacidad: number[]; pedido: number[]; holgura: number[]; saturacion: number[]; holguraAcum: number }
}

function semaforo(s: number) {
  if (s < 80) return { color: VERDE, ic: '✓', txt: 'Holgura' }
  if (s < 95) return { color: AMARILLO, ic: '⚠', txt: 'Ajustado' }
  if (s <= 110) return { color: NARANJA, ic: '⚠', txt: 'Crítico' }
  return { color: ROJO, ic: '🔴', txt: 'Déficit' }
}

const TT = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 12 } as const

export function SaturacionClient({ today, canManage }: { today: string; canManage: boolean }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const [data, setData] = useState<Sat | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [open, setOpen] = useState({ carn: true, mol: true, mil: true })
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLDivElement>(null)

  const dIni = parseYMD(weekStart), dFin = parseYMD(addDays(weekStart, 5))
  const week = isoWeek(weekStart)
  const semana = `${dIni.getFullYear()}-W${pad(week)}`
  const periodo = `Semana ${week} · ${pad(dIni.getDate())} ${MESES[dIni.getMonth()]} — ${pad(dFin.getDate())} ${MESES[dFin.getMonth()]} ${dFin.getFullYear()}`

  const load = useCallback((sem: string) => {
    setLoading(true)
    fetch(`/api/capacidad/saturacion?semana=${sem}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setData(d?.data ?? null))
      .catch(() => setData(null)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load(semana) }, [semana, load])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const fd = new FormData()
    fd.append('file', f); fd.append('semana', semana); fd.append('desde', weekStart); fd.append('hasta', addDays(weekStart, 5))
    setLoading(true)
    const res = await fetch('/api/capacidad/proyeccion', { method: 'POST', body: fd })
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (res.ok) {
      const r = await res.json()
      setToast(`✓ Proyección cargada — Semana ${week} · ${pad(dIni.getDate())}/${pad(dIni.getMonth() + 1)} al ${pad(dFin.getDate())}/${pad(dFin.getMonth() + 1)}/${dFin.getFullYear()} · ${r.productos} productos`)
      load(semana)
    } else {
      const e2 = await res.json().catch(() => ({})); setToast(e2.error || 'Error al cargar la proyección')
    }
    setTimeout(() => setToast(null), 4000)
  }

  async function exportarPdf() {
    if (!pdfRef.current) return
    await exportPdf(pdfRef.current, { reportName: 'Saturación Semanal', plant: 'Planta', period: periodo, user: '' }, `saturacion_${semana}`)
  }

  return (
    <div className="space-y-5">
      {/* Selector + carga */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-border-dark overflow-hidden">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-2 text-[#999] hover:text-white hover:bg-border-dark"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-4 py-2 text-sm font-medium text-white border-x border-border-dark whitespace-nowrap">{periodo}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-2 text-[#999] hover:text-white hover:bg-border-dark"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {canManage && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-pulse-red text-white text-sm font-semibold hover:bg-pulse-red/90">
              <Upload className="w-4 h-4" /> Cargar Proyección (.xlsx)
            </button>
          </>
        )}
        {data && <button onClick={exportarPdf} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-sm text-[#ccc] hover:border-pulse-red"><Download className="w-4 h-4" /> Exportar PDF</button>}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#666]" />}
      </div>

      {!data && !loading && (
        <div className="rounded-xl border text-center py-16" style={{ background: CARD, borderColor: CARD_BORDER }}>
          <FileSpreadsheet className="w-10 h-10 text-[#555] mx-auto mb-3" />
          <p className="text-white font-semibold">Sin proyección para esta semana</p>
          <p className="text-sm text-[#666] mt-1">Carga el archivo de proyección (.xlsx) con las hojas BASE y PROYECCIÓN.</p>
        </div>
      )}

      {data && (
        <div ref={pdfRef} className="space-y-5">
          {/* 1. CARNICERÍA */}
          <Section title="1 · Carnicería" open={open.carn} onToggle={() => setOpen((o) => ({ ...o, carn: !o.carn }))}>
            <CarniceriaChart d={data} />
            <Semaforos dias={data.dias} sat={data.carniceria.saturacion} />
          </Section>

          {/* 2. CARNES MOLIDAS */}
          <Section title="2 · Carnes Molidas" open={open.mol} onToggle={() => setOpen((o) => ({ ...o, mol: !o.mol }))}>
            <MolidasChart d={data} />
            <HolguraMolidas dias={data.dias} holgura={data.molidas.holguraH} />
          </Section>

          {/* 3. MILANESAS */}
          <Section title="3 · Milanesas" open={open.mil} onToggle={() => setOpen((o) => ({ ...o, mil: !o.mil }))}>
            <MilanesasChart d={data} />
            <HolguraMilanesas dias={data.dias} holgura={data.milanesas.holgura} acum={data.milanesas.holguraAcum} />
          </Section>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold shadow-xl max-w-[90vw]" style={{ background: toast.startsWith('✓') ? VERDE : ROJO }}>
          <Check className="w-4 h-4 shrink-0" /> <span className="text-sm">{toast}</span>
        </div>
      )}
    </div>
  )
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ background: CARD, borderColor: CARD_BORDER }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04]">
        <span className="font-rajdhani font-bold text-lg text-white uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#aaa]" /> : <ChevronDown className="w-5 h-5 text-[#aaa]" />}
      </button>
      {open && <div className="px-4 pb-4 pt-4 space-y-3 border-t" style={{ borderColor: CARD_BORDER }}>{children}</div>}
    </div>
  )
}

function CarniceriaChart({ d }: { d: Sat }) {
  const grupos = d.carniceria.grupos
  const data = d.dias.map((dia, i) => ({ dia, pedido: grupos.reduce((a, g) => a + g.pt[i], 0), capacidad: d.carniceria.capacidad[i] }))
  return (
    <ResponsiveContainer width="100%" height={256}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="dia" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v, n) => [`${fmt(Number(v))} kg`, n]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="pedido" name="Pedido PT" fill={CARN} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
        <Line type="monotone" dataKey="capacidad" name="Capacidad PT" stroke={ROJO} strokeWidth={2} strokeDasharray="6 4" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function MolidasChart({ d }: { d: Sat }) {
  const m = d.molidas
  // Capacidad = (horas disponibles − horas de variedades) × 2.600 kg/h
  const data = d.dias.map((dia, i) => ({ dia, pedido: m.pedidoMolidas[i], variedades: m.pedidoHamburguesas[i] + m.pedidoAlbondigas[i], total: m.pedidoMolidas[i] + m.pedidoHamburguesas[i] + m.pedidoAlbondigas[i], capacidad: m.capacidadMolidas[i] }))
  return (
    <ResponsiveContainer width="100%" height={256}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="dia" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v, n) => [`${fmt(Number(v))} kg`, n]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="pedido" name="Pedido Molidas" stackId="kg" fill={MOL} maxBarSize={56} isAnimationActive={false} />
        <Bar dataKey="variedades" name="Variedades" stackId="kg" fill={VAR} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
        <Line type="monotone" dataKey="capacidad" name="Capacidad" stroke={ROJO} strokeWidth={2} strokeDasharray="6 4" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function MilanesasChart({ d }: { d: Sat }) {
  const m = d.milanesas
  const data = d.dias.slice(0, 5).map((dia, i) => ({ dia, pedido: m.pedido[i], capacidad: m.capacidad[i] }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="dia" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v, n) => [`${fmt(Number(v))} kg`, n]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="pedido" name="Pedido" fill={MIL} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
        <Line type="monotone" dataKey="capacidad" name="Capacidad" stroke={ROJO} strokeWidth={2} strokeDasharray="6 4" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function Semaforos({ dias, sat }: { dias: string[]; sat: number[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {dias.map((dia, i) => { const s = semaforo(sat[i]); return (
        <div key={dia} className="flex-1 min-w-[90px] rounded-lg border px-2 py-1.5 text-center" style={{ borderColor: s.color }}>
          <div className="text-xs text-[#888]">{dia}</div>
          <div className="font-bold text-sm" style={{ color: s.color }}>{fmt1(sat[i])}%</div>
          <div className="text-[10px]" style={{ color: s.color }}>{s.ic} {s.txt}</div>
        </div>
      ) })}
    </div>
  )
}

function HolguraMolidas({ dias, holgura }: { dias: string[]; holgura: number[] }) {
  return (
    <div className="rounded-lg border p-3" style={{ background: PANEL, borderColor: CARD_BORDER }}>
      <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">Holgura para adelantar variedades</p>
      <div className="flex flex-wrap gap-2">
        {dias.slice(0, 5).map((dia, i) => { const ok = holgura[i] > 0.5, warn = holgura[i] >= 0 && holgura[i] <= 0.5; const col = ok ? VERDE : warn ? NARANJA : ROJO; return (
          <div key={dia} className="flex-1 min-w-[80px] text-center">
            <div className="text-xs text-[#888]">{dia}</div>
            <div className="font-bold text-sm" style={{ color: col }}>{holgura[i] >= 0 ? '+' : ''}{fmt1(holgura[i])}h</div>
            <div style={{ color: col }}>{ok ? '✓' : warn ? '⚠' : '🔴'}</div>
          </div>
        ) })}
      </div>
      <p className="text-[10px] text-[#666] mt-2">Holgura positiva → puede adelantar variedades ese día · negativa → déficit, redistribuir.</p>
    </div>
  )
}

function HolguraMilanesas({ dias, holgura, acum }: { dias: string[]; holgura: number[]; acum: number }) {
  return (
    <div className="rounded-lg border p-3" style={{ background: PANEL, borderColor: CARD_BORDER }}>
      <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">Holgura para adelantar pedidos</p>
      <div className="flex flex-wrap gap-2">
        {dias.slice(0, 5).map((dia, i) => { const ok = holgura[i] >= 0; const col = ok ? VERDE : ROJO; return (
          <div key={dia} className="flex-1 min-w-[80px] text-center">
            <div className="text-xs text-[#888]">{dia}</div>
            <div className="font-bold text-sm" style={{ color: col }}>{ok ? '+' : ''}{fmt(holgura[i])} kg</div>
            <div style={{ color: col }}>{ok ? '✓' : '🔴'}</div>
          </div>
        ) })}
      </div>
      <p className="text-sm text-[#ccc] mt-2 flex items-center gap-1.5">
        {acum >= 0 ? <Check className="w-4 h-4 text-status-ok" /> : <AlertTriangle className="w-4 h-4 text-pulse-red" />}
        Holgura acumulada semana: <b style={{ color: acum >= 0 ? VERDE : ROJO }}>{acum >= 0 ? '+' : ''}{fmt(acum)} kg</b>
      </p>
    </div>
  )
}
