import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

/**
 * Actualiza el ciclo de vida de una alerta.
 * Body: { action: 'acknowledge' | 'resolve', note? }
 *  - acknowledge: marca como vista (RECONOCIDA) sin cerrarla. Cualquier rol autenticado.
 *  - resolve: cierra la alerta con una nota. Solo Supervisores y Administradores.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const alert = await prisma.alert.findUnique({ where: { id: params.id } })
  if (!alert) return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const userName = session.user.name ?? session.user.email ?? 'Usuario'

  if (action === 'acknowledge') {
    if (alert.status !== 'ACTIVA') {
      return NextResponse.json({ error: 'La alerta ya fue reconocida o resuelta' }, { status: 400 })
    }
    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'RECONOCIDA', acknowledgedBy: userName, acknowledgedAt: new Date() },
    })
    return NextResponse.json({ id: updated.id, status: updated.status })
  }

  if (action === 'resolve') {
    const role = session.user.role
    if (role !== 'ADMINISTRADOR' && role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Solo Supervisores y Administradores pueden resolver alertas' }, { status: 403 })
    }
    if (alert.status === 'RESUELTA') {
      return NextResponse.json({ error: 'La alerta ya está resuelta' }, { status: 400 })
    }
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (!note) return NextResponse.json({ error: 'Debes escribir una nota de resolución' }, { status: 400 })

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'RESUELTA', resolvedBy: userName, resolvedAt: new Date(), resolutionNote: note, autoResolved: false },
    })
    return NextResponse.json({ id: updated.id, status: updated.status })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
