import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Gauge } from 'lucide-react'
import { CapacidadTabs } from '@/components/capacidad/CapacidadTabs'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { PlanClient } from './PlanClient'
import { weeksInMonth } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ALLOWED = ['ADMINISTRADOR', 'SUPERVISOR']

export default async function PlanPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Gauge className="w-6 h-6 text-pulse-red" /> Capacidad vs Demanda
      </h1>
      <p className="text-sm text-[#666] mt-0.5">Planificación de demanda mensual por línea y semana</p>
    </div>
  )

  if (!ALLOWED.includes(role)) {
    return <div className="space-y-6">{header}<AccessDenied /></div>
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const lines = await prisma.productionLine.findMany({ orderBy: { code: 'asc' } })
  const plans = await prisma.demandPlan.findMany({ where: { year, month } })
  const planMap: Record<string, Record<number, number>> = {}
  for (const p of plans) {
    planMap[p.lineId] ??= {}
    planMap[p.lineId][p.week] = p.demandKg
  }

  const weeks = weeksInMonth(year, month)
  const rows = lines.map((l) => ({
    lineId: l.id,
    lineName: l.name,
    lineCode: l.code,
    weeks: Array.from({ length: weeks }, (_, i) => planMap[l.id]?.[i + 1] ?? 0),
  }))

  return (
    <div className="space-y-6">
      {header}
      <CapacidadTabs />
      <PlanClient initialYear={year} initialMonth={month} initialWeeks={weeks} initialRows={rows} />
    </div>
  )
}
