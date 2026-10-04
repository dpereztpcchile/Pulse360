'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, ClipboardList, CheckCircle2, CalendarDays, Search } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
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

const RESPONSABLES: NcResponsableKey[] = ['PROVEEDOR', 'PLANTA']
const DESTINOS: NcDestinoKey[] = ['VENTA_A_TERCEROS', 'DECOMISO', 'DEVOLUCION', 'RETENIDO', 'OTRO']

const fmtMoney = (v: number | null) => v == null ? '—' : `$${Math.round(v).toLocaleString('es-CL')}`

export function NcClient({
  initialNcs, kpis,
}: {
  initialNcs: Nc[]
  kpis: { totalNc: number; activas: number; gestionadas: number; esteMes: number }
  role: string
}) {
  const [fResponsable, setFResponsable] = useState<'TODOS' | NcResponsableKey>('TODOS')
  const [fDestino, setFDestino] = useState<'TODOS' | NcDestinoKey>('TODOS')
  const [fGestionado, setFGestionado] = useState<'TODOS' | 'SI' | 'NO'>('TODOS')
  const [fBusqueda, setFBusqueda] = useState('')

  const filtered = useMemo(() => {
    return initialNcs.filter((n) => {
      if (fResponsable !== 'TODOS' && n.responsable !== fResponsable) return false
      if (fDestino !== 'TODOS' && n.destino !== fDestino) return false
      if (fGestionado === 'SI' && !n.gestionado) return false
      if (fGestionado === 'NO' && n.gestionado) return false
      if (fBusqueda) {
        const q = fBusqueda.toLowerCase()
        const hay = `${n.ncNumber} ${n.producto} ${n.razon} ${n.proveedor ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [initialNcs, fResponsable, fDestino, fGestionado, fBusqueda])

  const hasFilters = fResponsable !== 'TODOS' || fDestino !== 'TODOS' || fGestionado !== 'TODOS' || fBusqueda

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
      </p>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
          <input value={fBusqueda} onChange={(e) => setFBusqueda(e.target.value)} placeholder="Buscar N° NC, producto, razón o proveedor"
            className="pl-9 pr-3 py-2 w-72 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
        </div>
        <select value={fResponsable} onChange={(e) => setFResponsable(e.target.value as 'TODOS' | NcResponsableKey)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todos los responsables</option>
          {RESPONSABLES.map((r) => <option key={r} value={r}>{NC_RESPONSABLE[r].label}</option>)}
        </select>
        <select value={fDestino} onChange={(e) => setFDestino(e.target.value as 'TODOS' | NcDestinoKey)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todos los destinos</option>
          {DESTINOS.map((d) => <option key={d} value={d}>{NC_DESTINO[d].label}</option>)}
        </select>
        <select value={fGestionado} onChange={(e) => setFGestionado(e.target.value as 'TODOS' | 'SI' | 'NO')}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Gestionadas y activas</option>
          <option value="SI">Solo gestionadas</option>
          <option value="NO">Solo activas</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFBusqueda(''); setFResponsable('TODOS'); setFDestino('TODOS'); setFGestionado('TODOS') }}
            className="text-xs text-[#666] hover:text-white transition-colors">Limpiar filtros</button>
        )}
        <span className="text-xs text-[#666] ml-auto">{filtered.length} de {initialNcs.length} NC</span>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">N° NC</th>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Sem.</th>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-left font-medium">Razón</th>
                <th className="px-4 py-3 text-right font-medium">Cant. (kg)</th>
                <th className="px-4 py-3 text-right font-medium">Valor NC (OC)</th>
                <th className="px-4 py-3 text-left font-medium">Destino</th>
                <th className="px-4 py-3 text-left font-medium">Responsable</th>
                <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                <th className="px-4 py-3 text-left font-medium">Estado NC</th>
                <th className="px-4 py-3 text-center font-medium">Gestionada</th>
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
