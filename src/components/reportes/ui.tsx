'use client'

import { ReactNode } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Tarjeta KPI con el estilo del dashboard. */
export function Kpi({ label, value, sub, accent }: {
  label: string
  value: ReactNode
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[#666]">{label}</p>
      <p className={cn('kpi-value mt-1', accent ? 'text-pulse-red' : 'text-white')}>{value}</p>
      {sub && <p className="text-xs text-[#666] mt-0.5">{sub}</p>}
    </div>
  )
}

/** Contenedor de sección con título. */
export function SectionCard({ title, children, className }: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card p-4', className)}>
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  )
}

/** Botones de exportación. Ocultos si el usuario no puede exportar. */
export function ExportButtons({ canExport, onExcel, onPdf, busy }: {
  canExport: boolean
  onExcel: () => void
  onPdf: () => void
  busy: boolean
}) {
  if (!canExport) return null
  return (
    <div className="flex items-center gap-2">
      <button onClick={onExcel} disabled={busy} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </button>
      <button onClick={onPdf} disabled={busy} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
      </button>
    </div>
  )
}

/** Tabla simple con encabezados. */
export function DataTable({ columns, rows }: {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (v: unknown, row: Record<string, unknown>) => ReactNode }[]
  rows: Record<string, unknown>[]
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[#666] py-6 text-center">Sin datos en el período</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wide">
            {columns.map((c) => (
              <th key={c.key} className={cn('py-2 px-3 font-medium', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-dark/50 hover:bg-border-dark/30">
              {columns.map((c) => (
                <td key={c.key} className={cn('py-2 px-3 text-[#ddd]', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Estado de carga / error genérico. */
export function ReportState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#666]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Generando reporte…
      </div>
    )
  }
  if (error) {
    return <div className="card p-6 text-center text-pulse-red">{error}</div>
  }
  return null
}
