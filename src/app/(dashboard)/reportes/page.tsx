import Link from 'next/link'
import { FileBarChart, BarChart3, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-pulse-red" /> Reportes
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Consolida datos históricos y genera informes con gráficos exportables</p>
      </div>

      {/* Reportes disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/produccion/ordenes/reporte" className="card p-5 hover:border-pulse-red transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-lg bg-pulse-red/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-pulse-red" />
            </span>
            <h3 className="font-bold text-white">Reporte Nivel de Servicio</h3>
          </div>
          <p className="text-sm text-[#888] leading-snug">
            Cumplimiento de Órdenes de Fabricación, quiebre por grupo de producto y cascada de pérdidas (Fill Rate).
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-pulse-red text-sm font-semibold">
            Generar <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>

      <p className="text-xs text-[#555]">Más reportes se irán habilitando a medida que avancen los módulos.</p>
    </div>
  )
}
