import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  const lines = await prisma.productionLine.findMany({
    orderBy: { code: 'asc' },
    include: { orders: { where: { date: { gte: start, lte: end } }, select: { realKg: true } } },
  })

  const result = lines.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    status: l.status,
    dailyPlanKg: l.dailyPlanKg,
    oee: l.oee,
    utilization: l.utilization,
    dayKg: l.orders.reduce((sum, o) => sum + o.realKg, 0),
  }))

  return NextResponse.json(result)
}
