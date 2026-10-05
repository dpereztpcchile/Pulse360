'use client'

import { useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import {
  Factory, Truck, Filter, ClipboardList, Coins, HandCoins, BarChart3, X, ChevronDown,
} from 'lucide-react'
import { Kpi, IconKpi, SectionCard, DataTable, ReportState } from '@/components/reportes/ui'
import {
  BrandDonut, MoneyLineChart, MoneyBars, MiniHorizontalBars,
} from '@/components/reportes/ReportCharts'
import { cn } from '@/lib/utils'

type Grupo = 'PROVEEDOR' | 'PLANTA'

interface GestionadoStats {
  si: number
  no: number
  siPct: number
  noPct: number
}

interface IndicadoresProveedor {
  grupo: 'PROVEEDOR'
  totalNc: number
  totalValorNcOC: number
  montoRecaudadoVentaTercero: number
  impacto: number
  retornoPct: number
  gestionado: GestionadoStats
  porProveedorRazon: { proveedor: string; razon: string; valorNcOC: number; cantidad: number }[]
  porProveedor: { proveedor: string; valorNcOC: number; cantidad: number; participacionPct: number }[]
  porRazon: { razon: string; valorNcOC: number; cantidad: number }[]
  porSemana: { semana: number; valorNcOC: number; cantidad: number }[]
  porProductoRazon: { producto: string; razon: string; cantidad: number; valorNcOC: number }[]
  semanasDisponibles: number[]
  mesesDisponibles: string[]
}

interface IndicadoresPlanta {
  grupo: 'PLANTA'
  totalNc: number
  totalValorNcOC: number
  totalValorVentaNc: number
  porSemanaRazon: { semana: number; razon: string; valorNcOC: number; cantidad: number }[]
  porRazon: { razon: string; valorNcOC: number; cantidad: number }[]
  porSemana: { semana: number; valorNcOC: number; cantidad: number }[]
}

type IndicadoresData = IndicadoresProveedor | IndicadoresPlanta

const fmtMoney = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`

const MES_LABELS: Record<string, string> = {
  '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr', '05': 'may', '06': 'jun',
  '07': 'jul', '08': 'ago', '09': 'sept', '10': 'oct', '11': 'nov', '12': 'dic',
}
const mesLabel = (ym: string) => MES_LABELS[ym.slice(5, 7)] ?? ym

export function NcIndicadoresClient() {
  const [grupo, setGrupo] = useState<Grupo>('PROVEEDOR')
  const [excluirEnvase, setExcluirEnvase] = useState(false)
  const [semanasSel, setSemanasSel] = useState<Set<number>>(new Set())
  const [mesesSel, setMesesSel] = useState<Set<string>>(new Set())
  const [data, setData] = useState<IndicadoresData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ grupo })
      if (excluirEnvase) params.set('excluirEnvase', '1')
      if (semanasSel.size > 0) params.set('semanas', Array.from(semanasSel).join(','))
      if (mesesSel.size > 0) params.set('meses', Array.from(mesesSel).join(','))
      const res = await fetch(`/api/nc/indicadores?${params.toString()}`)
      if (!res.ok) throw new Error('No se pudieron cargar los indicadores.')
      const d = await res.json()
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar indicadores.')
    } finally {
      setLoading(false)
    }
  }, [grupo, excluirEnvase, semanasSel, mesesSel])

  useEffect(() => { cargar() }, [cargar])

  // Al cambiar de grupo, las semanas/meses seleccionados pueden no existir en el nuevo
  // grupo — se limpian para evitar un filtro "fantasma" que deje la vista sin datos.
  const cambiarGrupo = (g: Grupo) => {
    setGrupo(g)
    setSemanasSel(new Set())
    setMesesSel(new Set())
  }

  const toggleSemana = (s: number) => {
    setSemanasSel((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }
  const toggleMes = (m: string) => {
    setMesesSel((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m); else next.add(m)
      return next
    })
  }
  const limpiarFiltros = () => { setSemanasSel(new Set()); setMesesSel(new Set()) }

  const semanasDisponibles = data?.grupo === 'PROVEEDOR' ? data.semanasDisponibles : []
  const mesesDisponibles = data?.grupo === 'PROVEEDOR' ? data.mesesDisponibles : []
  const hayFiltrosActivos = semanasSel.size > 0 || mesesSel.size > 0 || excluirEnvase
  const esProveedor = data?.grupo === 'PROVEEDOR'

  return (
    <div className="space-y-5">
      {/* Selector de grupo + segmentadores + acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border-dark overflow-hidden">
          <GrupoButton icon={Truck} label="Proveedor" active={grupo === 'PROVEEDOR'} onClick={() => cambiarGrupo('PROVEEDOR')} />
          <GrupoButton icon={Factory} label="Planta" active={grupo === 'PLANTA'} onClick={() => cambiarGrupo('PLANTA')} />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#999] cursor-pointer select-none">
          <input type="checkbox" checked={excluirEnvase} onChange={(e) => setExcluirEnvase(e.target.checked)}
            className="accent-pulse-red w-4 h-4" />
          Excluir insumos de envase/embalaje
        </label>

        {esProveedor && (
          <SegmentadoresInline
            semanasDisponibles={semanasDisponibles}
            mesesDisponibles={mesesDisponibles}
            semanasSel={semanasSel}
            mesesSel={mesesSel}
            onToggleSemana={toggleSemana}
            onToggleMes={toggleMes}
          />
        )}

        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros} className="ml-auto flex items-center gap-1 text-xs text-[#666] hover:text-white">
            <X className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {loading && <ReportState loading error={null} />}
      {!loading && error && <ReportState loading={false} error={error} />}

      {!loading && !error && data && data.grupo === 'PROVEEDOR' && <ProveedorView data={data} />}
      {!loading && !error && data && data.grupo === 'PLANTA' && <PlantaView data={data} />}
    </div>
  )
}

function GrupoButton({ icon: Icon, label, active, onClick }: {
  icon: typeof Truck
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
        active ? 'bg-pulse-red text-white' : 'bg-card-dark text-[#999] hover:text-white')}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// "SEGMENTADORES" en línea — selección múltiple de semanas y meses,
// cada uno como lista desplegable compacta ubicada en la fila superior
// (junto al selector de grupo y "Limpiar filtros").
// ═══════════════════════════════════════════════════════════
function SegmentadoresInline({ semanasDisponibles, mesesDisponibles, semanasSel, mesesSel, onToggleSemana, onToggleMes }: {
  semanasDisponibles: number[]
  mesesDisponibles: string[]
  semanasSel: Set<number>
  mesesSel: Set<string>
  onToggleSemana: (s: number) => void
  onToggleMes: (m: string) => void
}) {
  const semanasLabel = semanasSel.size === 0
    ? 'Todas las semanas'
    : semanasSel.size === 1
      ? `Semana ${Array.from(semanasSel)[0]}`
      : `${semanasSel.size} semanas seleccionadas`

  const mesesLabel = mesesSel.size === 0
    ? 'Todos los meses'
    : mesesSel.size === 1
      ? mesLabel(Array.from(mesesSel)[0])
      : `${mesesSel.size} meses seleccionados`

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#999]">
        <Filter className="w-3.5 h-3.5" /> SEGMENTADORES:
      </span>

      <MultiSelectDropdown label={semanasLabel} disabled={semanasDisponibles.length === 0} widthClass="w-44">
        {semanasDisponibles.map((s) => (
          <DropdownCheckboxItem key={s} checked={semanasSel.has(s)} onChange={() => onToggleSemana(s)}>
            Semana {s}
          </DropdownCheckboxItem>
        ))}
      </MultiSelectDropdown>

      <MultiSelectDropdown label={mesesLabel} disabled={mesesDisponibles.length === 0} widthClass="w-44">
        {mesesDisponibles.map((m) => (
          <DropdownCheckboxItem key={m} checked={mesesSel.has(m)} onChange={() => onToggleMes(m)}>
            <span className="capitalize">{mesLabel(m)}</span>
          </DropdownCheckboxItem>
        ))}
      </MultiSelectDropdown>
    </div>
  )
}

/** Lista desplegable reutilizable para selección múltiple (checkboxes dentro). */
function MultiSelectDropdown({ label, disabled, children, widthClass = 'w-full' }: {
  label: string
  disabled?: boolean
  children: ReactNode
  widthClass?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (disabled) {
    return <p className={cn('text-xs text-[#555] py-2 px-3', widthClass)}>Sin opciones</p>
  }

  return (
    <div className={cn('relative', widthClass)} ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-xs py-2 px-3 rounded border border-border-dark bg-bg-dark text-white hover:border-pulse-red transition-colors">
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-[#999] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded border border-border-dark bg-[#111] shadow-xl py-1">
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownCheckboxItem({ checked, onChange, children }: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-xs py-1.5 px-3 cursor-pointer select-none hover:bg-white/5 text-[#ccc]">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-pulse-red w-3.5 h-3.5 shrink-0" />
      <span className={cn(checked && 'text-white font-medium')}>{children}</span>
    </label>
  )
}

function ProveedorView({ data }: { data: IndicadoresProveedor }) {
  if (data.totalNc === 0) {
    return <div className="card p-10 text-center text-[#666] text-sm">Sin NC de Proveedor en el período seleccionado.</div>
  }

  const porSemanaLine = data.porSemana.map((s) => ({ semana: `${s.semana}`, valorNcOC: s.valorNcOC }))
  const porRazonBars = data.porRazon.map((r) => ({ razon: r.razon, valorNcOC: r.valorNcOC }))
  const gestionadoDonut = [
    { name: 'NO GESTIONADO', value: data.gestionado.no },
    { name: 'SI GESTIONADO', value: data.gestionado.si },
  ]

  const top3Proveedores = data.porProveedor.slice(0, 3)

  return (
    <div className="space-y-5">
      {/* 4 KPI cards estilo mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconKpi icon={ClipboardList} value={data.totalNc.toLocaleString('es-CL')}
          caption="NO CONFORMIDADES DEL PERIODO (PRODUCTOS CÁRNICOS)" />
        <IconKpi icon={Coins} value={fmtMoney(data.totalValorNcOC)}
          caption="MONTO TOTAL GENERADO POR NC" />
        <IconKpi icon={HandCoins} value={fmtMoney(data.montoRecaudadoVentaTercero)}
          caption="MONTO RECAUDADO POR V.T." />
        <IconKpi icon={BarChart3} caption="BALANCE DEL PERIODO">
          <div className="text-sm leading-tight space-y-0.5">
            <p className="text-white font-semibold">IMPACTO: <span className="text-pulse-red">{fmtMoney(data.impacto)}</span></p>
            <p className="text-white font-semibold">RETORNO: <span className="text-status-ok">{data.retornoPct.toLocaleString('es-CL')}%</span></p>
          </div>
        </IconKpi>
      </div>

      {/* Fila de gráficos: línea semanal / razón / gestionado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Monto generado (semanas)">
          <MoneyLineChart data={porSemanaLine} xKey="semana" yKey="valorNcOC" />
        </SectionCard>
        <SectionCard title="Razón no conformidades">
          <MoneyBars data={porRazonBars} xKey="razon" yKey="valorNcOC" color="#3B82F6" angledLabels />
        </SectionCard>
        <SectionCard title="Gestionado">
          <BrandDonut data={gestionadoDonut} colors={['#F59E0B', '#3B82F6']} />
        </SectionCard>
      </div>

      {/* Top 3 proveedores */}
      <SectionCard title="Top 3 proveedores">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3Proveedores.map((p) => (
            <ProveedorMiniCard key={p.proveedor} proveedor={p} detalle={data.porProveedorRazon} totalNc={data.totalNc} />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

/** Mini-card de un proveedor: barras horizontales por razón + barra resumen oscura. */
function ProveedorMiniCard({ proveedor, detalle, totalNc }: {
  proveedor: { proveedor: string; valorNcOC: number; cantidad: number; participacionPct: number }
  detalle: { proveedor: string; razon: string; valorNcOC: number; cantidad: number }[]
  totalNc: number
}) {
  const razones = detalle
    .filter((d) => d.proveedor === proveedor.proveedor)
    .sort((a, b) => b.valorNcOC - a.valorNcOC)
    .map((d) => ({ razon: d.razon, valorNcOC: d.valorNcOC }))

  return (
    <div className="rounded-lg border border-border-dark overflow-hidden">
      <p className="text-xs font-semibold text-white text-center py-2 bg-border-dark/40">{proveedor.proveedor}</p>
      <div className="px-2 pt-2">
        <MiniHorizontalBars data={razones} xKey="razon" yKey="valorNcOC" />
      </div>
      <div className="grid grid-cols-3 text-center text-[10px] text-[#ccc] bg-[#111] py-2 border-t border-border-dark">
        <div>
          <p className="text-[#666] uppercase">Total</p>
          <p className="font-semibold text-white">{fmtMoney(proveedor.valorNcOC)}</p>
        </div>
        <div>
          <p className="text-[#666] uppercase">Suma NC</p>
          <p className="font-semibold text-white">{proveedor.cantidad}</p>
        </div>
        <div>
          <p className="text-[#666] uppercase">Participación</p>
          <p className="font-semibold text-white">{proveedor.participacionPct.toLocaleString('es-CL')}%</p>
        </div>
      </div>
    </div>
  )
}

function PlantaView({ data }: { data: IndicadoresPlanta }) {
  if (data.totalNc === 0) {
    return <div className="card p-10 text-center text-[#666] text-sm">Sin NC de Planta en el período seleccionado.</div>
  }

  const porRazonDonut = data.porRazon.map((r) => ({ name: r.razon, value: r.valorNcOC }))
  const porSemanaBars = data.porSemana.map((s) => ({ semana: `S${s.semana}`, valorNcOC: s.valorNcOC }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi label="Total NC" value={data.totalNc.toLocaleString('es-CL')} />
        <Kpi label="Valor NC (OC)" value={fmtMoney(data.totalValorNcOC)} accent />
        <Kpi label="Valor venta NC" value={fmtMoney(data.totalValorVentaNc)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Valor NC (OC) por razón">
          <BrandDonut data={porRazonDonut} />
        </SectionCard>
        <SectionCard title="Evolución semanal — Valor NC (OC)">
          <MoneyBars data={porSemanaBars} xKey="semana" yKey="valorNcOC" color="#CC0000" />
        </SectionCard>
      </div>

      <SectionCard title="Detalle por semana y razón">
        <DataTable
          columns={[
            { key: 'semana', label: 'Semana', render: (v) => `S${v}` },
            { key: 'razon', label: 'Razón' },
            { key: 'cantidad', label: 'N° NC', align: 'right' },
            { key: 'valorNcOC', label: 'Valor NC (OC)', align: 'right', render: (v) => fmtMoney(Number(v)) },
          ]}
          rows={data.porSemanaRazon}
        />
      </SectionCard>
    </div>
  )
}
