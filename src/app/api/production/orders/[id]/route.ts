import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'

const VALID_SHIFTS = ['MANANA', 'TARDE', 'NOCHE']
const VALID_STATUS = ['PLANIFICADA', 'EN_PROCESO', 'COMPLETADA', 'DETENIDA']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'])
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const role = session.user.role
  const body = await req.json()
  const data: Record<string, unknown> = {}

  // Operador: solo puede actualizar producción real y estado
  if (body.realKg !== undefined) {
    const real = Number(body.realKg)
    if (isNaN(real) || real < 0) {
      return NextResponse.json({ error: 'La producción real debe ser un número válido' }, { status: 400 })
    }
    data.realKg = real
  }
  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    data.status = body.status
  }

  // Campos de edición completa: solo Administrador y Supervisor
  if (role === 'ADMINISTRADOR' || role === 'SUPERVISOR') {
    if (body.product !== undefined) {
      if (!body.product.trim()) return NextResponse.json({ error: 'Producto inválido' }, { status: 400 })
      data.product = body.product.trim()
    }
    if (body.lineId !== undefined) data.lineId = body.lineId
    if (body.shift !== undefined) {
      if (!VALID_SHIFTS.includes(body.shift)) return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })
      data.shift = body.shift
    }
    if (body.date !== undefined) data.date = new Date(body.date)
    if (body.plannedKg !== undefined) {
      const planned = Number(body.plannedKg)
      if (!planned || planned <= 0) return NextResponse.json({ error: 'Cantidad planificada inválida' }, { status: 400 })
      data.plannedKg = planned
    }
    if (body.responsible !== undefined) {
      if (!body.responsible.trim()) return NextResponse.json({ error: 'Responsable inválido' }, { status: 400 })
      data.responsible = body.responsible.trim()
    }
    if (body.observations !== undefined) data.observations = body.observations?.trim() || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin cambios o sin permisos para los campos enviados' }, { status: 400 })
  }

  await prisma.productionOrder.update({ where: { id: params.id }, data })
  return NextResponse.json({ ok: true })
}
