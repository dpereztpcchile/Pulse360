import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

const VALID_STATUS = ['ABIERTA', 'EN_INVESTIGACION', 'ACCION_CORRECTIVA', 'CERRADA']

/**
 * PATCH NC. Solo Administrador y Supervisor pueden editar campos y cambiar estado.
 * Los cambios de estado quedan registrados en el historial.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const role = session.user.role
  if (role !== 'ADMINISTRADOR' && role !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Solo Supervisores y Administradores pueden editar o cerrar NC' }, { status: 403 })
  }

  const existing = await prisma.nonConformity.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: 'NC no encontrada' }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}

  // Campos editables
  if (body.area !== undefined) data.area = body.area?.trim()
  if (body.title !== undefined) data.title = body.title?.trim()
  if (body.description !== undefined) data.description = body.description?.trim()
  if (body.rootCause !== undefined) data.rootCause = body.rootCause?.trim() || null
  if (body.correctiveAction !== undefined) data.correctiveAction = body.correctiveAction?.trim() || null
  if (body.responsible !== undefined) data.responsible = body.responsible?.trim()
  if (body.category !== undefined) data.category = body.category
  if (body.severity !== undefined) data.severity = body.severity
  if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate)

  // Cambio de estado → registra historial
  let statusChange: { from: string; to: string } | null = null
  if (body.status !== undefined && body.status !== existing.status) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    data.status = body.status
    data.closedAt = body.status === 'CERRADA' ? new Date() : null
    statusChange = { from: existing.status, to: body.status }
  }

  const updated = await prisma.nonConformity.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(statusChange
        ? {
            history: {
              create: {
                fromStatus: statusChange.from as never,
                toStatus: statusChange.to as never,
                changedBy: session.user.name ?? 'Sistema',
                note: body.note?.trim() || null,
              },
            },
          }
        : {}),
    },
  })

  return NextResponse.json({ id: updated.id })
}

/** Eliminar NC: solo Administrador. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (session?.user?.role !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  await prisma.nonConformity.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
