import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'
import { recomputeAndPersistOee } from '@/lib/control-turno/service'

// PATCH  → iniciar / terminar / actualizar campos de un registro de producción
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const reg = await prisma.registroProduccion.findUnique({
    where: { id: params.id },
    include: { linea: { select: { id: true, code: true } } },
  })
  if (!reg) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.action === 'iniciar') {
    data.horaInicio = new Date()
    data.estado = 'EN_PROCESO'
  } else if (body.action === 'terminar') {
    data.horaTermino = new Date()
    data.estado = 'COMPLETADO'
  }

  if (body.dotacion !== undefined) data.dotacion = body.dotacion === null ? null : Number(body.dotacion)
  if (body.observaciones !== undefined) data.observaciones = body.observaciones || null
  if (body.kgReal !== undefined) data.kgReal = body.kgReal === null ? null : Number(body.kgReal)

  // Envasado: kg envasados = rentapacks × peso unitario
  if (body.rentapacks !== undefined) {
    const rp = body.rentapacks === null ? null : Number(body.rentapacks)
    data.rentapacks = rp
    const peso = body.pesoUnitarioKg != null ? Number(body.pesoUnitarioKg) : reg.pesoUnitarioKg
    if (rp != null && peso != null) data.kgReal = rp * peso
  }
  if (body.pesoUnitarioKg !== undefined) data.pesoUnitarioKg = body.pesoUnitarioKg === null ? null : Number(body.pesoUnitarioKg)

  const updated = await prisma.registroProduccion.update({ where: { id: params.id }, data })

  // Recalcular OEE de la línea (si aplica)
  const oee = await recomputeAndPersistOee(reg.linea.id, reg.linea.code, reg.fecha, reg.turno)

  return NextResponse.json({ registro: updated, oee })
}
