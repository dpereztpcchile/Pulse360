import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'
import { computeDerivados } from '@/lib/control-turno/carniceria'

// PATCH  → iniciar / terminar / actualizar kg de un corte (control secuencial)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const corte = await prisma.registroCorteCarniceria.findUnique({
    where: { id: params.id },
    include: { programa: { select: { id: true, dotacion: true } } },
  })
  if (!corte) return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.action === 'iniciar') {
    // Secuencial: todos los cortes anteriores deben estar COMPLETADO
    const previos = await prisma.registroCorteCarniceria.findMany({
      where: { programaId: corte.programaId, orden: { lt: corte.orden } },
      select: { estado: true },
    })
    if (previos.some((p) => p.estado !== 'COMPLETADO')) {
      return NextResponse.json({ error: 'Debe completar el corte anterior antes de iniciar este' }, { status: 400 })
    }
    data.horaInicio = new Date()
    data.estado = 'EN_PROCESO'
    data.registradoPor = session.user?.name ?? 'Operador'
  } else if (body.action === 'terminar') {
    if (!corte.horaInicio) return NextResponse.json({ error: 'El corte no ha sido iniciado' }, { status: 400 })
    data.horaTermino = new Date()
    data.estado = 'COMPLETADO'
  }

  if (body.kgMPReal !== undefined) data.kgMPReal = body.kgMPReal === null || body.kgMPReal === '' ? null : Number(body.kgMPReal)
  if (body.kgPTReal !== undefined) data.kgPTReal = body.kgPTReal === null || body.kgPTReal === '' ? null : Number(body.kgPTReal)
  if (body.observaciones !== undefined) data.observaciones = body.observaciones || null

  // Recalcular derivados con el estado resultante
  const horaInicio = (data.horaInicio as Date) ?? corte.horaInicio
  const horaTermino = (data.horaTermino as Date) ?? corte.horaTermino
  const kgMPReal = (data.kgMPReal !== undefined ? data.kgMPReal : corte.kgMPReal) as number | null
  const kgPTReal = (data.kgPTReal !== undefined ? data.kgPTReal : corte.kgPTReal) as number | null
  const der = computeDerivados({ horaInicio, horaTermino, kgMPReal, kgPTReal, dotacion: corte.programa.dotacion })
  data.hhReales = der.hhReales
  data.prodReal = der.prodReal
  data.rendReal = der.rendReal

  const updated = await prisma.registroCorteCarniceria.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}
