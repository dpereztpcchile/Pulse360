import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LayoutDashboard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard Operacional</h1>
          <p className="text-sm text-[#666] mt-0.5">
            Bienvenido, <span className="text-white font-medium">{session?.user?.name}</span>
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#666]">
          <span className="w-2 h-2 rounded-full bg-status-ok animate-pulse" /> En vivo
        </span>
      </div>

      {/* Estado vacío — las tarjetas se irán agregando con cada módulo */}
      <div className="card flex flex-col items-center justify-center text-center py-20">
        <LayoutDashboard className="w-10 h-10 text-[#333] mb-4" />
        <p className="text-sm text-[#888] font-medium">El dashboard se irá construyendo por módulos</p>
        <p className="text-xs text-[#555] mt-1 max-w-md">
          Las tarjetas e indicadores aparecerán aquí a medida que cada módulo de la plataforma esté listo.
        </p>
      </div>
    </div>
  )
}
