import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { NcDetailClient } from './NcDetailClient'

export const dynamic = 'force-dynamic'

export default async function NcDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'
  const userName = session?.user?.name ?? ''

  const nc = await prisma.nonConformity.findUnique({
    where: { id: params.id },
    include: { history: { orderBy: { createdAt: 'asc' } } },
  })

  if (!nc) notFound()

  const serialized = {
    id: nc.id,
    ncNumber: nc.ncNumber,
    area: nc.area,
    category: nc.category,
    severity: nc.severity,
    status: nc.status,
    title: nc.title,
    description: nc.description,
    rootCause: nc.rootCause,
    correctiveAction: nc.correctiveAction,
    responsible: nc.responsible,
    dueDate: nc.dueDate.toISOString(),
    evidenceUrl: nc.evidenceUrl,
    evidenceName: nc.evidenceName,
    createdBy: nc.createdBy,
    createdAt: nc.createdAt.toISOString(),
    closedAt: nc.closedAt ? nc.closedAt.toISOString() : null,
    history: nc.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: h.changedBy,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
  }

  return <NcDetailClient nc={serialized} role={role} userName={userName} />
}
