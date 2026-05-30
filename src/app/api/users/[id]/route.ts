import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    data.name = body.name.trim()
  }
  if (body.email !== undefined) {
    const normalizedEmail = body.email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }
    data.email = normalizedEmail
  }
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    data.role = body.role
  }
  if (body.plantId !== undefined) data.plantId = body.plantId || null
  if (body.active !== undefined) {
    // Evitar que un administrador se desactive a sí mismo
    if (body.active === false && params.id === session.user.id) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 })
    }
    data.active = body.active
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: params.id }, data })
  return NextResponse.json({ ok: true })
}
