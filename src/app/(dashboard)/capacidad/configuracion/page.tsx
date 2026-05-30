import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Gauge } from 'lucide-react'
import { CapacidadTabs } from '@/components/capacidad/CapacidadTabs'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { ConfigClient } from './ConfigClient'
import { weeklyCapacityKg } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ALLOWED = ['ADMINISTRADOR', 'SUPERVISOR']

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Gauge className="w-6 h-6 text-pulse-red" /> Capacidad vs Demanda
      </h1>
      <p className="text-sm text-[#666] mt-0.5">Configuración de capacidad instalada por línea</p>
    </div>
  )

  if (!ALLOWED.includes(role)) {
    return <div className="space-y-6">{header}<AccessDenied /></div>
  }

  const lines = await prisma.productionLine.findMany({
    orderBy: { code: 'asc' },
    include: { capacity: true },
  })

  const rows = lines.map((l) => {
    const c = l.capacity
    const kgPerHour = c?.kgPerHour ?? 0
    const hoursPerShift = c?.hoursPerShift ?? 8
    const activeShifts = c?.activeShifts ?? 1
    const efficiency = c?.efficiency ?? 85
    return {
      lineId: l.id,
      lineName: l.name,
      lineCode: l.code,
      configured: !!c,
      kgPerHour, hoursPerShift, activeShifts, efficiency,
      weeklyCapacityKg: Math.round(weeklyCapacityKg(kgPerHour, hoursPerShift, activeShifts, efficiency)),
    }
  })

  return (
    <div className="space-y-6">
      {header}
      <CapacidadTabs />
      <ConfigClient initialRows={rows} />
    </div>
  )
}
