import Link from 'next/link'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { ReporteQuiebreClient } from './ReporteQuiebreClient'
import { appToday } from '@/lib/app-date'
import { Factory, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ReporteQuiebrePage() {
  const today = appToday()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Factory className="w-6 h-6 text-pulse-red" /> Producción
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Reporte Nivel de Servicio</p>
      </div>

      <ProductionTabs />

      <div className="flex items-center justify-between">
        <span className="text-sm text-[#888]">Análisis acumulado de cumplimiento de Órdenes de Fabricación</span>
        <Link href="/produccion/ordenes" className="btn-secondary text-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
        </Link>
      </div>

      <ReporteQuiebreClient today={today} />
    </div>
  )
}
