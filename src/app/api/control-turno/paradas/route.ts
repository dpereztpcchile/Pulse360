import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'
import { dayBounds, recomputeAndPersistOee } from '@/lib/control-turno/service'

// GET ?lineId=&fecha=&turno=  → paradas registradas de la línea en el turno
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const lineId = searchParams.get('lineId')
  const turno = searchParams.get('turno') ?? 'MANANA'
  if (!lineId) return NextResponse.json({ error: 'lineId requerido' }, { status: 400 })
  const { start, end } = dayBounds(searchParams.get('fecha'))

  const paradas = await prisma.paradaTurno.findMany({
    where: { lineaId: lineId, fecha: { gte: start, lte: end }, turno: turno as never },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(paradas)
}

// POST  → reemplaza las paradas de la línea/turno y recalcula el OEE
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para registrar paradas' }, { status: 403 })
  }

  const body = await req.json()
  const { lineId, fecha, turno = 'MANANA', paradas, registradoPor } = body
  if (!lineId || !Array.isArray(paradas)) {
    return NextResponse.json({ error: 'lineId y paradas son obligatorios' }, { status: 400 })
  }

  const line = await prisma.productionLine.findUnique({ where: { id: lineId }, select: { id: true, code: true } })
  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })

  const { start, end, day } = dayBounds(fecha)

  await prisma.$transaction([
    prisma.paradaTurno.deleteMany({ where: { lineaId: lineId, fecha: { gte: start, lte: end }, turno: turno as never } }),
    prisma.paradaTurno.createMany({
      data: paradas
        .filter((p: { motivo?: string; duracionMin?: number }) => p.motivo && Number(p.duracionMin) > 0)
        .map((p: { motivo: string; duracionMin: number }) => ({
          lineaId: lineId,
          fecha: day,
          turno: turno as never,
          motivo: p.motivo,
          duracionMin: Number(p.duracionMin),
          registradoPor: registradoPor || 'Supervisor',
        })),
    }),
  ])

  const oee = await recomputeAndPersistOee(line.id, line.code, day, turno)
  const saved = await prisma.paradaTurno.findMany({
    where: { lineaId: lineId, fecha: { gte: start, lte: end }, turno: turno as never },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ paradas: saved, oee })
}
