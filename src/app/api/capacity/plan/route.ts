import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { weeksInMonth } from '@/lib/utils'

const EDIT_ROLES = ['ADMINISTRADOR', 'SUPERVISOR']

/** Devuelve la matriz de demanda planificada (líneas × semanas) para un año/mes. */
export async function GET(req: Request) {
  if (!(await requireRole(EDIT_ROLES))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? '', 10) || now.getFullYear()
  const month = parseInt(searchParams.get('month') ?? '', 10) || now.getMonth() + 1

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })
  }

  const lines = await prisma.productionLine.findMany({ orderBy: { code: 'asc' } })
  const plans = await prisma.demandPlan.findMany({ where: { year, month } })

  // mapa lineId → { week → demandKg }
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

  return NextResponse.json({ year, month, weeks, rows })
}

/** Guarda (upsert) la matriz completa de demanda planificada del mes. */
export async function POST(req: Request) {
  if (!(await requireRole(EDIT_ROLES))) {
    return NextResponse.json({ error: 'Solo Supervisores y Administradores pueden guardar el plan' }, { status: 403 })
  }

  const body = await req.json()
  const year = parseInt(body.year, 10)
  const month = parseInt(body.month, 10)
  const cells: { lineId: string; week: number; demandKg: number }[] = body.cells

  if (!year || month < 1 || month > 12 || !Array.isArray(cells)) {
    return NextResponse.json({ error: 'Datos del plan inválidos' }, { status: 400 })
  }

  const ops = cells.map((c) => {
    const demandKg = Number(c.demandKg) || 0
    return prisma.demandPlan.upsert({
      where: { lineId_year_month_week: { lineId: c.lineId, year, month, week: c.week } },
      create: { lineId: c.lineId, year, month, week: c.week, demandKg },
      update: { demandKg },
    })
  })

  await prisma.$transaction(ops)
  return NextResponse.json({ ok: true, saved: ops.length })
}
