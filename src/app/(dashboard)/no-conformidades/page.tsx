import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NcClient } from './NcClient'
import { ncIsOverdue } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NoConformidadesPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const ncs = await prisma.nonConformity.findMany({ orderBy: { ncNumber: 'desc' } })

  const serialized = ncs.map((n) => ({
    id: n.id,
    ncNumber: n.ncNumber,
    area: n.area,
    category: n.category,
    severity: n.severity,
    status: n.status,
    title: n.title,
    responsible: n.responsible,
    dueDate: n.dueDate.toISOString(),
    createdAt: n.createdAt.toISOString(),
  }))

  // ── KPIs ──
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const abiertas = ncs.filter((n) => n.status !== 'CERRADA').length
  const criticas = ncs.filter((n) => n.severity === 'CRITICA' && n.status !== 'CERRADA').length
  const vencidas = ncs.filter((n) => ncIsOverdue(n.dueDate, n.status)).length
  const cerradasMes = ncs.filter((n) => n.status === 'CERRADA' && n.closedAt && n.closedAt >= monthStart).length

  const kpis = { abiertas, criticas, vencidas, cerradasMes }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-pulse-red" /> No Conformidades
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Registro y seguimiento de NC de calidad, inocuidad y proceso</p>
      </div>

      <NcClient initialNcs={serialized} kpis={kpis} role={role} userName={session?.user?.name ?? ''} />
    </div>
  )
}
