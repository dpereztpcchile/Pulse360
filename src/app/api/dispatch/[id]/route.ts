import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

const VALID_STATUS = ['PREPARANDO', 'LISTO', 'DESPACHADO', 'ENTREGADO']

/**
 * PATCH guía. Operador: solo cambia estado. Admin/Supervisor: edita todos los campos.
 * Al pasar a DESPACHADO/ENTREGADO se registra la hora real automáticamente si falta.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const role = session.user.role
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const existing = await prisma.dispatch.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Guía no encontrada' }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}

  // Cambio de estado (todos los roles)
  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    data.status = body.status
    // Sellos de hora real automáticos
    if (body.status === 'DESPACHADO' && !existing.dispatchedAt) data.dispatchedAt = new Date()
    if (body.status === 'ENTREGADO') {
      if (!existing.dispatchedAt) data.dispatchedAt = new Date()
      if (!existing.deliveredAt) data.deliveredAt = new Date()
    }
  }

  // Permitir set/override explícito de horas reales solo a gestores
  if (canManage) {
    if (body.dispatchedAt !== undefined) data.dispatchedAt = body.dispatchedAt ? new Date(body.dispatchedAt) : null
    if (body.deliveredAt !== undefined) data.deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null
  }

  // Campos editables solo por Admin/Supervisor
  if (canManage) {
    if (body.client !== undefined) data.client = body.client?.trim()
    if (body.product !== undefined) data.product = body.product?.trim()
    if (body.transporter !== undefined) data.transporter = body.transporter?.trim()
    if (body.plate !== undefined) data.plate = body.plate?.trim() || null
    if (body.clientPO !== undefined) data.clientPO = body.clientPO?.trim() || null
    if (body.observations !== undefined) data.observations = body.observations?.trim() || null
    if (body.quantityKg !== undefined) {
      const qty = Number(body.quantityKg)
      if (!qty || qty <= 0) return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
      data.quantityKg = qty
    }
    if (body.estimatedAt !== undefined) data.estimatedAt = new Date(body.estimatedAt)
    if (body.orderId !== undefined) data.orderId = body.orderId || null
  } else if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Solo puedes actualizar el estado' }, { status: 403 })
  }

  const updated = await prisma.dispatch.update({ where: { id: params.id }, data })
  return NextResponse.json({ id: updated.id })
}

/** Eliminar guía: solo Administrador. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (session?.user?.role !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  await prisma.dispatch.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
