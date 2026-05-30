'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Truck } from 'lucide-react'
import type { DispatchReport } from '@/lib/reports'
import { SimpleBars } from './ReportCharts'
import { Kpi, SectionCard, ExportButtons, DataTable, ReportState } from './ui'
import { exportExcel, exportPdf } from '@/lib/report-export'
import { fmtPeriod, useReportExport } from './useReportExport'

export function DespachoReportView({ canExport, user }: { canExport: boolean; user: string }) {
  const sp = useSearchParams()
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const [data, setData] = useState<DispatchReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const { busy, run } = useReportExport()

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetch(`/api/reports/despacho?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo generar el reporte'))))
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [from, to])

  const period = fmtPeriod(from, to)

  const onExcel = useCallback(() => {
    if (!data) return
    run(() => exportExcel(`Reporte_Despacho_${from}_${to}`, [
      { Métrica: 'Total despachado (kg)', Valor: data.kpis.totalKg },
      { Métrica: 'N° de guías', Valor: data.kpis.guides },
      { Métrica: 'Despacho a tiempo (%)', Valor: data.kpis.onTimePct },
    ], [
      { name: 'Clientes', rows: data.clients.map((r) => ({ Cliente: r.client, 'Cantidad (kg)': r.qty, Guías: r.guides })) },
      { name: 'Despachos por semana', rows: data.weekly.map((r) => ({ Semana: r.week, 'Cantidad (kg)': r.qty })) },
    ]))
  }, [data, from, to, run])

  const onPdf = useCallback(() => {
    if (!data || !captureRef.current) return
    run(() => exportPdf(captureRef.current!, { reportName: 'Reporte de Despacho', plant: data.meta.plant, period, user }, `Reporte_Despacho_${from}_${to}`))
  }, [data, from, to, period, user, run])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reportes" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al centro de reportes
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-pulse-red" /> Reporte de Despacho
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Período: {period}</p>
        </div>
        <ExportButtons canExport={canExport} onExcel={onExcel} onPdf={onPdf} busy={busy} />
      </div>

      <ReportState loading={loading} error={error} />

      {data && !loading && (
        <div ref={captureRef} className="space-y-6 bg-dark">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Kpi label="Total despachado" value={`${data.kpis.totalKg.toLocaleString('es-CL')} kg`} accent />
            <Kpi label="N° de guías" value={data.kpis.guides} />
            <Kpi label="Despacho a tiempo" value={`${data.kpis.onTimePct}%`} />
          </div>

          <SectionCard title="Despachos por semana (kg)">
            <SimpleBars data={data.weekly} xKey="week" yKey="qty" unit="kg" />
          </SectionCard>

          <SectionCard title="Ranking de clientes por volumen">
            <DataTable
              columns={[
                { key: 'client', label: 'Cliente' },
                { key: 'qty', label: 'Cantidad (kg)', align: 'right', render: (v) => Number(v).toLocaleString('es-CL') },
                { key: 'guides', label: 'Guías', align: 'right' },
              ]}
              rows={data.clients as unknown as Record<string, unknown>[]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
