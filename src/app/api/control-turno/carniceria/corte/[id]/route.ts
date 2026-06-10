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
    // La vista tablet envía bypass=true para permitir registrar inicio en cualquier orden
    if (!body.bypass) {
      const previos = await prisma.registroCorteCarniceria.findMany({
        where: { programaId: corte.programaId, orden: { lt: corte.orden } },
        select: { estado: true },
      })
      if (previos.some((p) => p.estado !== 'COMPLETADO')) {
        return NextResponse.json({ error: 'Debe completar el corte anterior antes de iniciar este' }, { status: 400 })
      }
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
  if (body.corteAlRojo !== undefined) data.corteAlRojo = body.corteAlRojo === null || body.corteAlRojo === '' ? null : Number(body.corteAlRojo)
  if (body.observaciones !== undefined) data.observaciones = body.observaciones || null

  // Campos de la vista tablet + desktop (subproductos)
  const floatFields = ['mpLote1', 'mpLote2', 'mpLote3', 'despunte7', 'despunte4', 'despunte4Linea', 'merma', 'sobranteDespacho', 'prolijado', 'recorteMagro', 'noConforme', 'noConformeKg'] as const
  for (const f of floatFields) {
    if (body[f] !== undefined) data[f] = body[f] === null || body[f] === '' ? null : Number(body[f])
  }
  if (body.motivoNC !== undefined) data.motivoNC = body.motivoNC || null
  if (body.cadena !== undefined) data.cadena = body.cadena || null

  // Detalle de filas (Json) de los campos acumulables del desktop
  const jsonFields = ['mpRows', 'corteAlRojoRows', 'despunte7Rows', 'despunte4Rows', 'recorteMagroRows', 'mermaRows', 'noConformeRows'] as const
  for (const f of jsonFields) {
    if (body[f] !== undefined) data[f] = body[f] === null ? null : (body[f] as unknown as object)
  }

  // MP Entregada acumulable: si vienen las filas de MP, kgMPReal = suma de todas las filas
  if (Array.isArray(body.mpRows)) {
    const total = (body.mpRows as unknown[]).reduce((a: number, v) => a + (Number(v) || 0), 0)
    data.kgMPReal = total > 0 ? total : null
  } else {
    // Compatibilidad: si cambian los lotes fijos (vista tablet), kgMPReal = suma de lotes
    const loteChanged = ['mpLote1', 'mpLote2', 'mpLote3'].some((f) => body[f] !== undefined)
    if (loteChanged) {
      const l1 = (data.mpLote1 !== undefined ? data.mpLote1 : corte.mpLote1) as number | null
      const l2 = (data.mpLote2 !== undefined ? data.mpLote2 : corte.mpLote2) as number | null
      const l3 = (data.mpLote3 !== undefined ? data.mpLote3 : corte.mpLote3) as number | null
      const total = (l1 ?? 0) + (l2 ?? 0) + (l3 ?? 0)
      data.kgMPReal = total > 0 ? total : null
    }
  }

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
