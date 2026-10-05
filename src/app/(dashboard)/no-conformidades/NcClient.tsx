'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ClipboardList, CheckCircle2, CalendarDays, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ColumnFilterPopover, type FilterOption } from '@/components/no-conformidades/ColumnFilterPopover'
import {
  cn, NC_RESPONSABLE, NC_DESTINO, NC_ESTADO, formatDate,
  type NcResponsableKey, type NcDestinoKey, type NcEstadoKey,
} from '@/lib/utils'

interface Nc {
  id: string
  ncNumber: number
  fecha: string
  semana: number
  producto: string
  razon: string
  cantidadKg: number
  valorNcOC: number | null
  valorVentaNc: number | null
  destino: NcDestinoKey
  responsable: NcResponsableKey
  proveedor: string | null
  estadoNc: NcEstadoKey | null
  gestionado: boolean
}

const NULL_VALUE = '__NULL__'
const fmtMoney = (v: number | null) => (v == null ? '—' : `$${Math.round(v).toLocaleString('es-CL')}`)

// ── Columnas filtrables (categóricas): valor crudo + etiqueta legible por fila ──
type FilterableKey = 'producto' | 'razon' | 'destino' | 'responsable' | 'proveedor' | 'estadoNc' | 'gestionado'

function rawValue(n: Nc, key: FilterableKey): string {
  switch (key) {
    case 'producto': return n.producto
    case 'razon': return n.razon
    case 'destino': return n.destino
    case 'responsable': return n.responsable
    case 'proveedor': return n.proveedor ?? NULL_VALUE
    case 'estadoNc': return n.estadoNc ?? NULL_VALUE
    case 'gestionado': return n.gestionado ? '1' : '0'
  }
}

function valueLabel(key: FilterableKey, value: string): string {
  switch (key) {
    case 'producto': return value
    case 'razon': return value
    case 'destino': return NC_DESTINO[value as NcDestinoKey].label
    case 'responsable': return NC_RESPONSABLE[value as NcResponsableKey].label
    case 'proveedor': return value === NULL_VALUE ? '— Sin proveedor' : value
    case 'estadoNc': return value === NULL_VALUE ? '— Sin estado' : NC_ESTADO[value as NcEstadoKey].label
    case 'gestionado': return value === '1' ? 'Gestionada' : 'Activa'
  }
}

// ── Filtro de período (semana o mes), vive en el encabezado "Fecha" ──
type PeriodMode = 'semana' | 'mes'
const monthKey = (iso: string) => iso.slice(0, 7) // "YYYY-MM"
const monthLabel = (key: string) => {
  const d = new Date(`${key}-01T00:00:00Z`)
  const s = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Ordenamiento ──
type SortKey = 'ncNumber' | 'fecha' | 'semana' | 'producto' | 'razon' | 'cantidadKg' | 'valorNcOC'
  | 'destino' | 'responsable' | 'proveedor' | 'estadoNc' | 'gestionado'
type SortDir = 'asc' | 'desc'

function sortValue(n: Nc, key: SortKey): string | number {
  switch (key) {
    case 'ncNumber': return n.ncNumber
    case 'fecha': return n.fecha
    case 'semana': return n.semana
    case 'producto': return n.producto.toLowerCase()
    case 'razon': return n.razon.toLowerCase()
    case 'cantidadKg': return n.cantidadKg
    case 'valorNcOC': return n.valorNcOC ?? -Infinity
    case 'destino': return NC_DESTINO[n.destino].label
    case 'responsable': return NC_RESPONSABLE[n.responsable].label
    case 'proveedor': return n.proveedor?.toLowerCase() ?? ''
    case 'estadoNc': return n.estadoNc ? NC_ESTADO[n.estadoNc].label : ''
    case 'gestionado': return n.gestionado ? 1 : 0
  }
}

interface ColumnDef {
  key: SortKey
  label: string
  align?: 'right' | 'center'
  filterKey?: FilterableKey
  searchable?: boolean
}

const COLUMNS: ColumnDef[] = [
  { key: 'ncNumber', label: 'N° NC' },
  { key: 'fecha', label: 'Fecha' }, // filtro de período se agrega aparte, en esta misma celda
  { key: 'semana', label: 'Sem.' },
  { key: 'producto', label: 'Producto', filterKey: 'producto', searchable: true },
  { key: 'razon', label: 'Razón', filterKey: 'razon', searchable: true },
  { key: 'cantidadKg', label: 'Cant. (kg)', align: 'right' },
  { key: 'valorNcOC', label: 'Valor NC (OC)', align: 'right' },
  { key: 'destino', label: 'Destino', filterKey: 'destino' },
  { key: 'responsable', label: 'Responsable', filterKey: 'responsable' },
  { key: 'proveedor', label: 'Proveedor', filterKey: 'proveedor', searchable: true },
  { key: 'estadoNc', label: 'Estado NC', filterKey: 'estadoNc' },
  { key: 'gestionado', label: 'Gestionada', align: 'center', filterKey: 'gestionado' },
]

const FILTERABLE_KEYS = COLUMNS.map((c) => c.filterKey).filter((k): k is FilterableKey => !!k)

export function NcClient({
  initialNcs, kpis,
}: {
  initialNcs: Nc[]
  kpis: { totalNc: number; activas: number; gestionadas: number; esteMes: number }
  role: string
}) {
  const [filters, setFilters] = useState<Record<FilterableKey, Set<string> | null>>(
    () => Object.fromEntries(FILTERABLE_KEYS.map((k) => [k, null])) as Record<FilterableKey, Set<string> | null>
  )
  const [periodMode, setPeriodMode] = useState<PeriodMode>('semana')
  const [periodSelected, setPeriodSelected] = useState<Set<string> | null>(null)
  const [openFilter, setOpenFilter] = useState<FilterableKey | 'fecha' | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('fecha')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  /** Aplica todos los filtros activos excepto el indicado (para calcular opciones "progresivas" tipo Excel). */
  function applyFilters(rows: Nc[], excludeKey?: FilterableKey | 'period'): Nc[] {
    return rows.filter((n) => {
      for (const key of FILTERABLE_KEYS) {
        if (key === excludeKey) continue
        const sel = filters[key]
        if (sel !== null && !sel.has(rawValue(n, key))) return false
      }
      if (excludeKey !== 'period' && periodSelected !== null) {
        const v = periodMode === 'semana' ? String(n.semana) : monthKey(n.fecha)
        if (!periodSelected.has(v)) return false
      }
      return true
    })
  }

  const filtered = useMemo(() => {
    const result = applyFilters(initialNcs)
    const dir = sortDir === 'asc' ? 1 : -1
    result.sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNcs, filters, periodMode, periodSelected, sortKey, sortDir])

  function optionsFor(key: FilterableKey): { options: FilterOption[]; allValues: Set<string> } {
    const preRows = applyFilters(initialNcs, key)
    const counts = new Map<string, number>()
    for (const n of preRows) {
      const v = rawValue(n, key)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const options = Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: valueLabel(key, value), count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    return { options, allValues: new Set(counts.keys()) }
  }

  function periodOptions(): { options: FilterOption[]; allValues: Set<string> } {
    const preRows = applyFilters(initialNcs, 'period')
    const counts = new Map<string, number>()
    for (const n of preRows) {
      const v = periodMode === 'semana' ? String(n.semana) : monthKey(n.fecha)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const options = Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: periodMode === 'semana' ? `Semana ${value}` : monthLabel(value),
        count,
      }))
      .sort((a, b) => (periodMode === 'semana' ? Number(a.value) - Number(b.value) : a.value.localeCompare(b.value)))
    return { options, allValues: new Set(counts.keys()) }
  }

  const activeFilterCount =
    FILTERABLE_KEYS.filter((k) => filters[k] !== null).length + (periodSelected !== null ? 1 : 0)

  function limpiarFiltros() {
    setFilters(Object.fromEntries(FILTERABLE_KEYS.map((k) => [k, null])) as Record<FilterableKey, Set<string> | null>)
    setPeriodSelected(null)
  }

  const periodOpts = periodOptions()

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total NC" value={kpis.totalNc} unit="" icon={ClipboardList} status="neutral" />
        <KPICard title="Activas (no gestionadas)" value={kpis.activas} unit="" icon={AlertTriangle} status={kpis.activas > 0 ? 'warn' : 'ok'} />
        <KPICard title="Gestionadas" value={kpis.gestionadas} unit="" icon={CheckCircle2} status="ok" />
        <KPICard title="Este mes" value={kpis.esteMes} unit="" icon={CalendarDays} status="neutral" />
      </div>

      <p className="text-xs text-[#666]">
        Esta vista es solo de lectura: todas las NC se cargan desde el Excel en la pestaña{' '}
        <span className="text-white font-medium">Carga de archivos</span>. Las NC marcadas como{' '}
        <span className="text-white font-medium">gestionadas</span> (devolución coordinada con el proveedor) se excluyen de los Indicadores, pero quedan visibles aquí como histórico.
        {' '}Usa el ícono <span className="text-white font-medium">▼</span> de cada columna para filtrar, y haz clic en el nombre de la columna para ordenar.
      </p>

      <div className="flex items-center gap-3">
        {activeFilterCount > 0 && (
          <button onClick={limpiarFiltros} className="text-xs text-[#999] hover:text-white transition-colors underline underline-offset-2">
            Limpiar {activeFilterCount} filtro{activeFilterCount === 1 ? '' : 's'}
          </button>
        )}
        <span className="text-xs text-[#666] ml-auto">{filtered.length} de {initialNcs.length} NC</span>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                {COLUMNS.map(({ key, label, align, filterKey, searchable }) => {
                  const active = sortKey === key
                  const isFecha = key === 'fecha'
                  const { options, allValues } = filterKey ? optionsFor(filterKey) : { options: [], allValues: new Set<string>() }
                  return (
                    <th
                      key={key}
                      className={cn(
                        'px-4 py-3 font-medium select-none',
                        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                      )}
                    >
                      <div className={cn('inline-flex items-center gap-1.5', align === 'right' && 'flex-row-reverse')}>
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className={cn('inline-flex items-center gap-1 hover:text-white transition-colors', active && 'text-white')}
                        >
                          {label}
                          {active ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>

                        {filterKey && (
                          <ColumnFilterPopover
                            options={options}
                            allValues={allValues}
                            selected={filters[filterKey]}
                            onChange={(next) => setFilters((f) => ({ ...f, [filterKey]: next }))}
                            open={openFilter === filterKey}
                            onOpenChange={(o) => setOpenFilter(o ? filterKey : null)}
                            searchable={searchable}
                          />
                        )}

                        {isFecha && (
                          <ColumnFilterPopover
                            options={periodOpts.options}
                            allValues={periodOpts.allValues}
                            selected={periodSelected}
                            onChange={setPeriodSelected}
                            open={openFilter === 'fecha'}
                            onOpenChange={(o) => setOpenFilter(o ? 'fecha' : null)}
                            header={
                              <div className="flex rounded-md border border-border-dark overflow-hidden mb-2 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => { setPeriodMode('semana'); setPeriodSelected(null) }}
                                  className={cn('flex-1 py-1 transition-colors', periodMode === 'semana' ? 'bg-pulse-red text-white' : 'text-[#999] hover:text-white')}
                                >
                                  Semana
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setPeriodMode('mes'); setPeriodSelected(null) }}
                                  className={cn('flex-1 py-1 transition-colors', periodMode === 'mes' ? 'bg-pulse-red text-white' : 'text-[#999] hover:text-white')}
                                >
                                  Mes
                                </button>
                              </div>
                            }
                          />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-[#555]">Sin no conformidades que coincidan</td></tr>
              )}
              {filtered.map((n) => (
                <tr key={n.id} className={cn('transition-colors', n.gestionado ? 'opacity-60' : 'hover:bg-border-dark/30')}>
                  <td className="px-4 py-3 font-mono text-xs text-[#999] whitespace-nowrap">{n.ncNumber}</td>
                  <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDate(n.fecha)}</td>
                  <td className="px-4 py-3 text-[#999]">{n.semana}</td>
                  <td className="px-4 py-3 font-medium text-white max-w-[220px] truncate">{n.producto}</td>
                  <td className="px-4 py-3 text-[#999]">{n.razon}</td>
                  <td className="px-4 py-3 text-right text-[#999]">{n.cantidadKg.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-right text-[#999]">{fmtMoney(n.valorNcOC)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_DESTINO[n.destino].cls)}>
                      {NC_DESTINO[n.destino].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_RESPONSABLE[n.responsable].cls)}>
                      {NC_RESPONSABLE[n.responsable].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#999]">{n.proveedor ?? '—'}</td>
                  <td className="px-4 py-3">
                    {n.estadoNc ? (
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_ESTADO[n.estadoNc].cls)}>
                        {NC_ESTADO[n.estadoNc].label}
                      </span>
                    ) : <span className="text-[#555]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {n.gestionado ? <CheckCircle2 className="w-4 h-4 text-status-ok inline" /> : <span className="text-[#555]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
