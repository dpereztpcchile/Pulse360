import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { weeklyCapacityKg } from '@/lib/utils'

const EDIT_ROLES = ['ADMINISTRADOR', 'SUPERVISOR']

/** Lista las líneas con su configuración de capacidad y la capacidad semanal calculada. */
export async function GET() {
  if (!(await requireRole(EDIT_ROLES))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const lines = await prisma.productionLine.findMany({
    orderBy: { code: 'asc' },
    include: { capacity: true },
  })

  const data = lines.map((l) => {
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
      kgPerHour,
      hoursPerShift,
      activeShifts,
      efficiency,
      weeklyCapacityKg: weeklyCapacityKg(kgPerHour, hoursPerShift, activeShifts, efficiency),
    }
  })

  return NextResponse.json(data)
}

/** Crea o actualiza la configuración de capacidad de una línea. */
export async function POST(req: Request) {
  if (!(await requireRole(EDIT_ROLES))) {
    return NextResponse.json({ error: 'Solo Supervisores y Administradores pueden configurar capacidades' }, { status: 403 })
  }

  const body = await req.json()
  const { lineId, kgPerHour, hoursPerShift, activeShifts, efficiency } = body

  if (!lineId) {
    return NextResponse.json({ error: 'Falta la línea' }, { status: 400 })
  }
  const line = await prisma.productionLine.findUnique({ where: { id: lineId } })
  if (!line) {
    return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
  }

  const kgh = Number(kgPerHour)
  const hps = Number(hoursPerShift)
  const shifts = parseInt(activeShifts, 10)
  const eff = Number(efficiency)

  if ([kgh, hps, eff].some((n) => Number.isNaN(n) || n < 0) || Number.isNaN(shifts)) {
    return NextResponse.json({ error: 'Valores numéricos inválidos' }, { status: 400 })
  }
  if (shifts < 0 || shifts > 3) {
    return NextResponse.json({ error: 'Los turnos activos deben estar entre 0 y 3' }, { status: 400 })
  }
  if (eff > 100) {
    return NextResponse.json({ error: 'La eficiencia no puede superar 100%' }, { status: 400 })
  }

  const data = { kgPerHour: kgh, hoursPerShift: hps, activeShifts: shifts, efficiency: eff }
  const saved = await prisma.lineCapacity.upsert({
    where: { lineId },
    create: { lineId, ...data },
    update: data,
  })

  return NextResponse.json({
    lineId,
    weeklyCapacityKg: weeklyCapacityKg(saved.kgPerHour, saved.hoursPerShift, saved.activeShifts, saved.efficiency),
  })
}
