'use client'

import { useState, useMemo } from 'react'
import { Download, Search } from 'lucide-react'
import { cn, DISPATCH_STATUS, DISPATCH_STATUS_ORDER, formatDate, formatDateTime, type DispatchStatusKey } from '@/lib/utils'

interface Dispatch {
  id: string
  guideNumber: string
  client: string
  product: string
  quantityKg: number
  transporter: string
  plate: string | null
  clientPO: string | null
  orderNumber: string | null
  estimatedAt: string
  dispatchedAt: string | null
  deliveredAt: string | null
  status: DispatchStatusKey
}

function toCsv(rows: Dispatch[]) {
  const header = ['N° Guía', 'Cliente', 'Producto', 'Cantidad (kg)', 'Transportista', 'Patente', 'N° OC', 'Orden', 'Estado', 'Estimado', 'Despachado', 'Entregado']
  const esc = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((d) => [
    d.guideNumber, d.client, d.product, d.quantityKg, d.transporter, d.plate, d.clientPO, d.orderNumber,
    DISPATCH_STATUS[d.status].label,
    formatDateTime(d.estimatedAt),
    d.dispatchedAt ? formatDateTime(d.dispatchedAt) : '',
    d.deliveredAt ? formatDateTime(d.deliveredAt) : '',
  ].map(esc).join(';'))
  // BOM para que Excel reconozca UTF-8
  return '﻿' + [header.join(';'), ...lines].join('\r\n')
}

export function HistorialClient({ dispatches }: { dispatches: Dispatch[] }) {
  const [fClient, setFClient] = useState('')
  const [fDate, setFDate] = useState('')
  const [fStatus, setFStatus] = useState<'TODOS' | DispatchStatusKey>('TODOS')

  const filtered = useMemo(() => {
    return dispatches.filter((d) => {
      if (fClient && !d.client.toLowerCase().includes(fClient.toLowerCase())) return false
      if (fStatus !== 'TODOS' && d.status !== fStatus) return false
      if (fDate && d.estimatedAt.slice(0, 10) !== fDate) return false
      return true
    })
  }, [dispatches, fClient, fDate, fStatus])

  function download() {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `despachos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filtros + exportar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
          <input value={fClient} onChange={(e) => setFClient(e.target.value)} placeholder="Buscar cliente"
            className="pl-9 pr-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
        </div>
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as 'TODOS' | DispatchStatusKey)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todos los estados</option>
          {DISPATCH_STATUS_ORDER.map((s) => <option key={s} value={s}>{DISPATCH_STATUS[s].label}</option>)}
        </select>
        {(fClient || fDate || fStatus !== 'TODOS') && (
          <button onClick={() => { setFClient(''); setFDate(''); setFStatus('TODOS') }}
            className="text-xs text-[#666] hover:text-white transition-colors">Limpiar filtros</button>
        )}
        <span className="text-xs text-[#666] ml-auto">{filtered.length} guías</span>
        <button onClick={download} disabled={filtered.length === 0} className="btn-secondary text-sm disabled:opacity-50">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">N° Guía</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                <th className="px-4 py-3 text-left font-medium">Transportista</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Estimado</th>
                <th className="px-4 py-3 text-left font-medium">Despachado</th>
                <th className="px-4 py-3 text-left font-medium">Entregado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[#555]">Sin guías que coincidan</td></tr>
              )}
              {filtered.map((d) => {
                const st = DISPATCH_STATUS[d.status]
                return (
                  <tr key={d.id} className="hover:bg-border-dark/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#999]">{d.guideNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{d.client}</td>
                    <td className="px-4 py-3 text-[#999]">{d.product}</td>
                    <td className="px-4 py-3 text-right text-white font-rajdhani font-semibold">{d.quantityKg.toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-[#999]">{d.transporter}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', st.cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDate(d.estimatedAt)}</td>
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{d.dispatchedAt ? formatDateTime(d.dispatchedAt) : '—'}</td>
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{d.deliveredAt ? formatDateTime(d.deliveredAt) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
