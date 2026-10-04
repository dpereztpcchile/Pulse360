'use client'

import { useEffect, useState, useCallback } from 'react'
import { Factory, Truck, Filter, Loader2 } from 'lucide-react'
import { Kpi, SectionCard, DataTable, ReportState } from '@/components/reportes/ui'
import { SimpleBars, BrandDonut } from '@/components/reportes/ReportCharts'
import { cn } from '@/lib/utils'

type Grupo = 'PROVEEDOR' | 'PLANTA'

interface IndicadoresProveedor {
  grupo: 'PROVEEDOR'
  totalNc: number
  totalValorNcOC: number
  montoRecaudadoVentaTercero: number
  porProveedorRazon: { proveedor: string; razon: string; valorNcOC: number; cantidad: number }[]
  porProveedor: { proveedor: string; valorNcOC: number; cantidad: number }[]
  porRazon: { razon: string; valorNcOC: number; cantidad: number }[]
  porSemana: { semana: number; valorNcOC: number; cantidad: number }[]
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

export function NcIndicadoresClient() {
  const [grupo, setGrupo] = useState<Grupo>('PROVEEDOR')
  const [excluirEnvase, setExcluirEnvase] = useState(false)
  const [semanaDesde, setSemanaDesde] = useState('')
  const [semanaHasta, setSemanaHasta] = useState('')
  const [data, setData] = useState<IndicadoresData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ grupo })
      if (excluirEnvase) params.set('excluirEnvase', '1')
      if (semanaDesde) params.set('semanaDesde', semanaDesde)
      if (semanaHasta) params.set('semanaHasta', semanaHasta)
      const res = await fetch(`/api/nc/indicadores?${params.toString()}`)
      if (!res.ok) throw new Error('No se pudieron cargar los indicadores.')
      const d = await res.json()
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar indicadores.')
    } finally {
      setLoading(false)
    }
  }, [grupo, excluirEnvase, semanaDesde, semanaHasta])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-5">
      {/* Selector de grupo + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border-dark overflow-hidden">
          <GrupoButton icon={Truck} label="Proveedor" active={grupo === 'PROVEEDOR'} onClick={() => setGrupo('PROVEEDOR')} />
          <GrupoButton icon={Factory} label="Planta" active={grupo === 'PLANTA'} onClick={() => setGrupo('PLANTA')} />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#999] cursor-pointer select-none">
          <input type="checkbox" checked={excluirEnvase} onChange={(e) => setExcluirEnvase(e.target.checked)}
            className="accent-pulse-red w-4 h-4" />
          Excluir insumos de envase/embalaje
        </label>

        <div className="flex items-center gap-2 text-sm text-[#999] ml-auto">
          <Filter className="w-4 h-4" />
          <input type="number" placeholder="Sem. desde" value={semanaDesde} onChange={(e) => setSemanaDesde(e.target.value)}
            className="w-24 px-2 py-1.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
          <span className="text-[#555]">—</span>
          <input type="number" placeholder="Sem. hasta" value={semanaHasta} onChange={(e) => setSemanaHasta(e.target.value)}
            className="w-24 px-2 py-1.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
          {(semanaDesde || semanaHasta) && (
            <button onClick={() => { setSemanaDesde(''); setSemanaHasta('') }} className="text-xs text-[#666] hover:text-white">Limpiar</button>
          )}
        </div>
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

function ProveedorView({ data }: { data: IndicadoresProveedor }) {
  if (data.totalNc === 0) {
    return <div className="card p-10 text-center text-[#666] text-sm">Sin NC de Proveedor en el período seleccionado.</div>
  }

  const porProveedorDonut = data.porProveedor.map((p) => ({ name: p.proveedor, value: p.valorNcOC }))
  const porRazonBars = data.porRazon.map((r) => ({ razon: r.razon, valorNcOC: r.valorNcOC }))
  const porSemanaBars = data.porSemana.map((s) => ({ semana: `S${s.semana}`, valorNcOC: s.valorNcOC }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi label="Total NC" value={data.totalNc.toLocaleString('es-CL')} />
        <Kpi label="Valor NC (OC)" value={fmtMoney(data.totalValorNcOC)} accent />
        <Kpi label="Recaudado por venta a terceros" value={fmtMoney(data.montoRecaudadoVentaTercero)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Valor NC (OC) por proveedor">
          <BrandDonut data={porProveedorDonut} />
        </SectionCard>
        <SectionCard title="Valor NC (OC) por razón">
          <SimpleBars data={porRazonBars} xKey="razon" yKey="valorNcOC" unit="$" />
        </SectionCard>
      </div>

      <SectionCard title="Evolución semanal — Valor NC (OC)">
        <SimpleBars data={porSemanaBars} xKey="semana" yKey="valorNcOC" unit="$" />
      </SectionCard>

      <SectionCard title="Detalle por proveedor y razón">
        <DataTable
          columns={[
            { key: 'proveedor', label: 'Proveedor' },
            { key: 'razon', label: 'Razón' },
            { key: 'cantidad', label: 'N° NC', align: 'right' },
            { key: 'valorNcOC', label: 'Valor NC (OC)', align: 'right', render: (v) => fmtMoney(Number(v)) },
          ]}
          rows={data.porProveedorRazon}
        />
      </SectionCard>
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
          <SimpleBars data={porSemanaBars} xKey="semana" yKey="valorNcOC" unit="$" />
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
