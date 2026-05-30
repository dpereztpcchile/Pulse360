import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { password } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { id: params.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
