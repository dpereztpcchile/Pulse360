'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Package } from 'lucide-react'
import type { MaterialsReport } from '@/lib/reports'
import { SimpleBars, StockArea } from './ReportCharts'
import { Kpi, SectionCard, ExportButtons, DataTable, ReportState } from './ui'
import { exportExcel, exportPdf } from '@/lib/report-export'
import { fmtPeriod, useReportExport } from './useReportExport'

const fmtMin = (v: unknown) => {
  const n = v == null ? null : Number(v)
  if (n == null || Number.isNaN(n)) return 'En curso'
  if (n >= 60) return `${Math.floor(n / 60)}h ${n % 60}m`
  return `${n}m`
}
const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('es-CL') : '—')

export function MateriasPrimasReportView({ canExport, user }: { canExport: boolean; user: string }) {
  const sp = useSearchParams()
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const [data, setData] = useState<MaterialsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const { busy, run } = useReportExport()

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetch(`/api/reports/materias-primas?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo generar el reporte'))))
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [from, to])

  const period = fmtPeriod(from, to)

  const onExcel = useCallback(() => {
    if (!data) return
    run(() => exportExcel(`Reporte_MateriasPrimas_${from}_${to}`, [
      { Métrica: 'Consumo total (kg)', Valor: data.kpis.totalConsumedKg },
      { Métrica: 'Ingresos totales (kg)', Valor: data.kpis.totalReceivedKg },
      { Métrica: 'Alertas de stock', Valor: data.kpis.stockAlerts },
      { Métrica: 'Lotes por vencer', Valor: data.kpis.expiringLots },
    ], [
      { name: 'Consumo por insumo', rows: data.consumption.map((r) => ({ Código: r.code, Insumo: r.material, Cantidad: r.qty, Unidad: r.unit })) },
      { name: 'Evolución de stock', rows: data.stockEvolution.map((r) => ({ Semana: r.week, Stock: r.stock })) },
      { name: 'Alertas de stock', rows: data.alerts.map((r) => ({ Insumo: r.material, Inicio: fmtDate(r.createdAt), Resuelta: r.resolvedAt ? fmtDate(r.resolvedAt) : 'En curso', 'Duración (min)': r.durationMin ?? '' })) },
      { name: 'Proveedores', rows: data.suppliers.map((r) => ({ Proveedor: r.supplier, Ingresos: r.receipts, Cantidad: r.qty })) },
      { name: 'Lotes por vencer', rows: data.expiringLots.map((r) => ({ Insumo: r.material, Lote: r.lot, Vence: fmtDate(r.expiry), 'Días restantes': r.daysLeft, Estado: r.status })) },
    ]))
  }, [data, from, to, run])

  const onPdf = useCallback(() => {
    if (!data || !captureRef.current) return
    run(() => exportPdf(captureRef.current!, { reportName: 'Reporte de Materias Primas', plant: data.meta.plant, period, user }, `Reporte_MateriasPrimas_${from}_${to}`))
  }, [data, from, to, period, user, run])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reportes" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al centro de reportes
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-pulse-red" /> Reporte de Materias Primas
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Período: {period}</p>
        </div>
        <ExportButtons canExport={canExport} onExcel={onExcel} onPdf={onPdf} busy={busy} />
      </div>

      <ReportState loading={loading} error={error} />

      {data && !loading && (
        <div ref={captureRef} className="space-y-6 bg-dark">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Consumo total" value={`${data.kpis.totalConsumedKg.toLocaleString('es-CL')} kg`} accent />
            <Kpi label="Ingresos totales" value={`${data.kpis.totalReceivedKg.toLocaleString('es-CL')} kg`} />
            <Kpi label="Alertas de stock" value={data.kpis.stockAlerts} />
            <Kpi label="Lotes por vencer" value={data.kpis.expiringLots} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Consumo por insumo (kg)">
              <SimpleBars data={data.consumption.slice(0, 10).map((c) => ({ material: c.code, qty: c.qty }))} xKey="material" yKey="qty" unit="kg" />
            </SectionCard>
            <SectionCard title="Evolución de stock (semana a semana)">
              <StockArea data={data.stockEvolution} xKey="week" yKey="stock" />
            </SectionCard>
          </div>

          <SectionCard title="Consumo por insumo">
            <DataTable
              columns={[
                { key: 'code', label: 'Código' },
                { key: 'material', label: 'Insumo' },
                { key: 'qty', label: 'Cantidad', align: 'right', render: (v) => Number(v).toLocaleString('es-CL') },
                { key: 'unit', label: 'Unidad', align: 'center' },
              ]}
              rows={data.consumption as unknown as Record<string, unknown>[]}
            />
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Alertas de stock ocurridas">
              <DataTable
                columns={[
                  { key: 'material', label: 'Insumo' },
                  { key: 'createdAt', label: 'Inicio', render: fmtDate },
                  { key: 'durationMin', label: 'Duración', align: 'right', render: (v, row) => (row.ongoing ? 'En curso' : fmtMin(v)) },
                ]}
                rows={data.alerts as unknown as Record<string, unknown>[]}
              />
            </SectionCard>
            <SectionCard title="Proveedores con más ingresos">
              <DataTable
                columns={[
                  { key: 'supplier', label: 'Proveedor' },
                  { key: 'receipts', label: 'Ingresos', align: 'right' },
                  { key: 'qty', label: 'Cantidad (kg)', align: 'right', render: (v) => Number(v).toLocaleString('es-CL') },
                ]}
                rows={data.suppliers as unknown as Record<string, unknown>[]}
              />
            </SectionCard>
          </div>

          <SectionCard title="Lotes vencidos o próximos a vencer">
            <DataTable
              columns={[
                { key: 'material', label: 'Insumo' },
                { key: 'lot', label: 'Lote' },
                { key: 'expiry', label: 'Vence', render: fmtDate },
                { key: 'daysLeft', label: 'Días', align: 'right' },
                { key: 'status', label: 'Estado', align: 'center', render: (v) => (
                  <span className={String(v) === 'Vencido' ? 'text-pulse-red font-semibold' : 'text-status-warn'}>{String(v)}</span>
                ) },
              ]}
              rows={data.expiringLots as unknown as Record<string, unknown>[]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
