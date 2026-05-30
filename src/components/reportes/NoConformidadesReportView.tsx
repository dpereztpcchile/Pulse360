'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import type { NcReport } from '@/lib/reports'
import { BrandDonut, SimpleBars } from './ReportCharts'
import { Kpi, SectionCard, ExportButtons, DataTable, ReportState } from './ui'
import { exportExcel, exportPdf } from '@/lib/report-export'
import { fmtPeriod, useReportExport } from './useReportExport'

export function NoConformidadesReportView({ canExport, user }: { canExport: boolean; user: string }) {
  const sp = useSearchParams()
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const [data, setData] = useState<NcReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const { busy, run } = useReportExport()

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetch(`/api/reports/no-conformidades?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo generar el reporte'))))
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [from, to])

  const period = fmtPeriod(from, to)

  const onExcel = useCallback(() => {
    if (!data) return
    run(() => exportExcel(`Reporte_NoConformidades_${from}_${to}`, [
      { Métrica: 'NC creadas', Valor: data.kpis.created },
      { Métrica: 'NC cerradas', Valor: data.kpis.closed },
      { Métrica: 'NC vencidas', Valor: data.kpis.overdue },
    ], [
      { name: 'Por categoría', rows: data.byCategory.map((r) => ({ Categoría: r.name, Cantidad: r.value })) },
      { name: 'Por gravedad', rows: data.bySeverity.map((r) => ({ Gravedad: r.name, Cantidad: r.value })) },
      { name: 'Resolución por área', rows: data.avgResolutionByArea.map((r) => ({ Área: r.area, 'Días promedio': r.days, 'NC cerradas': r.count })) },
      { name: 'Ranking de áreas', rows: data.areaRanking.map((r) => ({ Área: r.area, 'N° de NC': r.count })) },
    ]))
  }, [data, from, to, run])

  const onPdf = useCallback(() => {
    if (!data || !captureRef.current) return
    run(() => exportPdf(captureRef.current!, { reportName: 'Reporte de No Conformidades', plant: data.meta.plant, period, user }, `Reporte_NoConformidades_${from}_${to}`))
  }, [data, from, to, period, user, run])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reportes" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al centro de reportes
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-pulse-red" /> Reporte de No Conformidades
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Período: {period}</p>
        </div>
        <ExportButtons canExport={canExport} onExcel={onExcel} onPdf={onPdf} busy={busy} />
      </div>

      <ReportState loading={loading} error={error} />

      {data && !loading && (
        <div ref={captureRef} className="space-y-6 bg-dark">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Kpi label="NC creadas" value={data.kpis.created} accent />
            <Kpi label="NC cerradas" value={data.kpis.closed} />
            <Kpi label="NC vencidas" value={data.kpis.overdue} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Distribución por categoría">
              <BrandDonut data={data.byCategory} />
            </SectionCard>
            <SectionCard title="Distribución por gravedad">
              <BrandDonut data={data.bySeverity} />
            </SectionCard>
          </div>

          <SectionCard title="Tiempo promedio de resolución por área (días)">
            <SimpleBars data={data.avgResolutionByArea.map((r) => ({ area: r.area, days: r.days }))} xKey="area" yKey="days" unit="días" />
          </SectionCard>

          <SectionCard title="Ranking de áreas con más NC">
            <DataTable
              columns={[
                { key: 'area', label: 'Área' },
                { key: 'count', label: 'N° de NC', align: 'right' },
              ]}
              rows={data.areaRanking as unknown as Record<string, unknown>[]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
