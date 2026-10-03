import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { DEFAULT_PASSWORD } from '@/lib/user-defaults'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'CALIDAD', 'VERIFICADOR']

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
  const { name, email, role, plantId } = body

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  // Todo usuario nuevo se crea con la contraseña por defecto y queda obligado
  // a cambiarla en su primer inicio de sesión (ver middleware.ts).
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12)
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      plantId: plantId || null,
      active: true,
      mustChangePassword: true,
    },
  })

  return NextResponse.json({ id: user.id, defaultPassword: DEFAULT_PASSWORD }, { status: 201 })
}
