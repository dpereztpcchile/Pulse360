import Link from 'next/link'
import { Construction, ArrowLeft } from 'lucide-react'

export function EnConstruccion() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-pulse-red/10 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-pulse-red" />
      </div>
      <h1 className="text-2xl font-bold text-white">Módulo en construcción</h1>
      <p className="text-sm text-[#666] mt-2 max-w-md">
        Este módulo está en desarrollo y estará disponible próximamente.
      </p>
      <Link href="/dashboard" className="btn-secondary text-sm inline-flex items-center gap-2 mt-6">
        <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
      </Link>
    </div>
  )
}
