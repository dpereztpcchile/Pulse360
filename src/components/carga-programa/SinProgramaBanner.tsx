import Link from 'next/link'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'

/** Banner mostrado por los módulos cuando no hay programa cargado para el día. */
export function SinProgramaBanner({ mensaje }: { mensaje?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-status-warn/10 border border-status-warn/30">
      <div className="flex items-center gap-2 text-sm text-status-warn">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>{mensaje ?? 'Sin programa para hoy'}</span>
      </div>
      <Link href="/carga-archivos" className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-pulse-red hover:bg-pulse-red-hover px-3 py-1.5 rounded-lg transition-colors">
        Ir a Carga de Archivos <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
