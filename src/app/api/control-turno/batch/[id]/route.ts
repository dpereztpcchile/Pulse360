import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'
import { recomputeAndPersistOee } from '@/lib/control-turno/service'

// PATCH  → iniciar / terminar un batch de molienda (desbloqueo secuencial)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const batch = await prisma.registroBatch.findUnique({
    where: { id: params.id },
    include: {
      registro: {
        include: {
          linea: { select: { id: true, code: true } },
          batches: { orderBy: { numeroBatch: 'asc' } },
        },
      },
    },
  })
  if (!batch) return NextResponse.json({ error: 'Batch no encontrado' }, { status: 404 })

  const body = await req.json()
  const siblings = batch.registro.batches
  const data: Record<string, unknown> = {}

  if (body.action === 'iniciar') {
    // Todos los batches anteriores deben estar COMPLETADO
    const previos = siblings.filter((b) => b.numeroBatch < batch.numeroBatch)
    const bloqueado = previos.some((b) => b.estado !== 'COMPLETADO')
    if (bloqueado) {
      return NextResponse.json({ error: 'Debe completar el batch anterior antes de iniciar este' }, { status: 400 })
    }
    data.horaInicio = new Date()
    data.estado = 'EN_PROCESO'
  } else if (body.action === 'terminar') {
    const termino = new Date()
    data.horaTermino = termino
    data.estado = 'COMPLETADO'
    if (batch.horaInicio) {
      data.duracionMinutos = Math.max(1, Math.round((termino.getTime() - new Date(batch.horaInicio).getTime()) / 60000))
    }
  }
  if (body.observacion !== undefined) data.observacion = body.observacion || null

  const updated = await prisma.registroBatch.update({ where: { id: params.id }, data })

  // Actualizar estado del registro padre
  const refreshed = await prisma.registroBatch.findMany({ where: { registroProduccionId: batch.registroProduccionId } })
  const allDone = refreshed.every((b) => b.estado === 'COMPLETADO')
  const anyStarted = refreshed.some((b) => b.estado !== 'PENDIENTE')
  await prisma.registroProduccion.update({
    where: { id: batch.registroProduccionId },
    data: {
      estado: allDone ? 'COMPLETADO' : anyStarted ? 'EN_PROCESO' : 'PENDIENTE',
      ...(allDone ? { horaTermino: new Date() } : {}),
      ...(batch.registro.horaInicio ? {} : { horaInicio: new Date() }),
    },
  })

  const oee = await recomputeAndPersistOee(batch.registro.linea.id, batch.registro.linea.code, batch.registro.fecha, batch.registro.turno)

  return NextResponse.json({ batch: updated, oee })
}
