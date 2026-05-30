'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Gauge } from 'lucide-react'
import type { CapacityReport } from '@/lib/reports'
import { CapacityDemandArea, SimpleBars } from './ReportCharts'
import { Kpi, SectionCard, ExportButtons, DataTable, ReportState } from './ui'
import { exportExcel, exportPdf } from '@/lib/report-export'
import { fmtPeriod, useReportExport } from './useReportExport'

export function CapacidadReportView({ canExport, user }: { canExport: boolean; user: string }) {
  const sp = useSearchParams()
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const [data, setData] = useState<CapacityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const { busy, run } = useReportExport()

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetch(`/api/reports/capacidad?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo generar el reporte'))))
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [from, to])

  const period = fmtPeriod(from, to)

  const onExcel = useCallback(() => {
    if (!data) return
    run(() => exportExcel(`Reporte_Capacidad_${from}_${to}`, [
      { Métrica: 'Semanas con ocupación crítica (>90%)', Valor: data.criticalWeeks },
      { Métrica: 'Líneas evaluadas', Valor: data.byLine.length },
    ], [
      { name: 'Ocupación por línea', rows: data.byLine.map((r) => ({ Línea: r.line, 'Ocupación promedio %': r.avgOccupation, Crítica: r.critical ? 'Sí' : 'No' })) },
      { name: 'Capacidad vs demanda', rows: data.weekly.map((r) => ({ Semana: r.week, 'Capacidad (kg)': r.capacidad, 'Demanda (kg)': r.demanda, 'Ocupación %': r.occupation, Crítica: r.critical ? 'Sí' : 'No' })) },
    ]))
  }, [data, from, to, run])

  const onPdf = useCallback(() => {
    if (!data || !captureRef.current) return
    run(() => exportPdf(captureRef.current!, { reportName: 'Reporte de Capacidad vs Demanda', plant: data.meta.plant, period, user }, `Reporte_Capacidad_${from}_${to}`))
  }, [data, from, to, period, user, run])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reportes" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al centro de reportes
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gauge className="w-6 h-6 text-pulse-red" /> Reporte de Capacidad vs Demanda
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Período: {period}</p>
        </div>
        <ExportButtons canExport={canExport} onExcel={onExcel} onPdf={onPdf} busy={busy} />
      </div>

      <ReportState loading={loading} error={error} />

      {data && !loading && (
        <div ref={captureRef} className="space-y-6 bg-dark">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kpi label="Semanas con ocupación crítica" value={data.criticalWeeks} accent={data.criticalWeeks > 0} sub=">90% de ocupación" />
            <Kpi label="Líneas evaluadas" value={data.byLine.length} />
          </div>

          <SectionCard title="Capacidad vs demanda (semana a semana)">
            <CapacityDemandArea data={data.weekly} />
          </SectionCard>

          <SectionCard title="Ocupación promedio por línea (%)">
            <SimpleBars data={data.byLine} xKey="line" yKey="avgOccupation" unit="%" highlightCritical />
          </SectionCard>

          <SectionCard title="Detalle semanal">
            <DataTable
              columns={[
                { key: 'week', label: 'Semana' },
                { key: 'capacidad', label: 'Capacidad (kg)', align: 'right', render: (v) => Number(v).toLocaleString('es-CL') },
                { key: 'demanda', label: 'Demanda (kg)', align: 'right', render: (v) => Number(v).toLocaleString('es-CL') },
                { key: 'occupation', label: 'Ocupación', align: 'right', render: (v, row) => (
                  <span className={row.critical ? 'text-pulse-red font-semibold' : 'text-[#ddd]'}>{Number(v)}%</span>
                ) },
              ]}
              rows={data.weekly as unknown as Record<string, unknown>[]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
