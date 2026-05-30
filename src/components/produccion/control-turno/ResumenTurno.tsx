'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ResumenLinea } from '@/lib/control-turno/service'

export function ResumenTurno({ resumen, turno }: { resumen: ResumenLinea[]; fecha: string; turno: string; plant: string; user: string }) {
  return (
    <div className="space-y-6">
      {/* Navegación a líneas */}
      <div>
        <h3 className="text-sm font-medium text-[#999] mb-3">Ir a la línea</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {resumen.map((r) => (
            <Link key={r.code} href={`/produccion/control-turno/${r.code}?turno=${turno}`}
              className="card flex items-center justify-between hover:border-pulse-red/40 transition-colors group">
              <div>
                <p className="font-medium text-white text-sm">{r.name}</p>
                <p className="text-xs text-[#666]">{r.estado}{r.oeeEnabled && r.oee != null ? ` · OEE ${r.oee}%` : ''}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#666] group-hover:text-pulse-red" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
