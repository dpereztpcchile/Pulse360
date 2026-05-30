'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Factory } from 'lucide-react'
import type { ProductionReport } from '@/lib/reports'
import { RealVsPlanLine, RealVsPlanBars, SimpleBars } from './ReportCharts'
import { Kpi, SectionCard, ExportButtons, DataTable, ReportState } from './ui'
import { exportExcel, exportPdf } from '@/lib/report-export'
import { fmtPeriod, useReportExport } from './useReportExport'

export function ProduccionReportView({ canExport, user }: { canExport: boolean; user: string }) {
  const sp = useSearchParams()
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const [data, setData] = useState<ProductionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const { busy, run } = useReportExport()

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetch(`/api/reports/produccion?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo generar el reporte'))))
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [from, to])

  const period = fmtPeriod(from, to)

  const onExcel = useCallback(() => {
    if (!data) return
    run(() => exportExcel(`Reporte_Produccion_${from}_${to}`, [
      { Métrica: 'Producción total (kg)', Valor: data.kpis.totalKg },
      { Métrica: 'Cumplimiento vs plan (%)', Valor: data.kpis.compliancePct },
      { Métrica: 'OEE promedio (%)', Valor: data.kpis.avgOee },
      { Métrica: 'Horas productivas', Valor: data.kpis.productiveHours },
      { Métrica: 'Horas paradas', Valor: data.kpis.stoppedHours },
    ], [
      { name: 'OEE por línea', rows: data.oeeByLine.map((r) => ({ Línea: r.line, 'OEE %': r.oee })) },
      { name: 'Producción diaria', rows: data.daily.map((r) => ({ Día: r.day, Real: r.real, Plan: r.plan })) },
      { name: 'Producción por línea', rows: data.byLine.map((r) => ({ Línea: r.line, Real: r.real, Plan: r.plan })) },
      { name: 'Paradas', rows: data.stops.map((r) => ({ Causa: r.cause, Frecuencia: r.freq, Minutos: r.minutes })) },
    ]))
  }, [data, from, to, run])

  const onPdf = useCallback(() => {
    if (!data || !captureRef.current) return
    run(() => exportPdf(captureRef.current!, { reportName: 'Reporte de Producción', plant: data.meta.plant, period, user }, `Reporte_Produccion_${from}_${to}`))
  }, [data, from, to, period, user, run])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reportes" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al centro de reportes
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-pulse-red" /> Reporte de Producción
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Período: {period}</p>
        </div>
        <ExportButtons canExport={canExport} onExcel={onExcel} onPdf={onPdf} busy={busy} />
      </div>

      <ReportState loading={loading} error={error} />

      {data && !loading && (
        <div ref={captureRef} className="space-y-6 bg-dark">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi label="Producción total" value={`${data.kpis.totalKg.toLocaleString('es-CL')} kg`} accent />
            <Kpi label="Cumplimiento" value={`${data.kpis.compliancePct}%`} />
            <Kpi label="OEE promedio" value={`${data.kpis.avgOee}%`} />
            <Kpi label="Horas productivas" value={`${data.kpis.productiveHours} h`} />
            <Kpi label="Horas paradas" value={`${data.kpis.stoppedHours} h`} />
          </div>

          <SectionCard title="Producción real vs plan (día a día)">
            <RealVsPlanLine data={data.daily} xKey="day" />
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Producción por línea">
              <RealVsPlanBars data={data.byLine} xKey="line" />
            </SectionCard>
            <SectionCard title="OEE por línea">
              <SimpleBars data={data.oeeByLine} xKey="line" yKey="oee" unit="%" />
            </SectionCard>
          </div>

          <SectionCard title="Tabla de paradas">
            <DataTable
              columns={[
                { key: 'cause', label: 'Causa' },
                { key: 'freq', label: 'Frecuencia', align: 'right' },
                { key: 'minutes', label: 'Duración (min)', align: 'right', render: (v) => Number(v).toLocaleString('es-CL') },
              ]}
              rows={data.stops as unknown as Record<string, unknown>[]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
