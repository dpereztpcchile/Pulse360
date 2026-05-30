import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR']

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    include: { plant: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, plantId } = body

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      plantId: plantId || null,
      active: true,
    },
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
