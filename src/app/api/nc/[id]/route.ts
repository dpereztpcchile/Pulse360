import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

/** GET detalle de una NC (modelo NcRegistro). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const nc = await prisma.ncRegistro.findUnique({ where: { id: params.id } })
  if (!nc) {
    return NextResponse.json({ error: 'NC no encontrada' }, { status: 404 })
  }
  return NextResponse.json(nc)
}

/**
 * Eliminar NC: solo Administrador. No hay edición manual de NC (todos los
 * datos provienen de la carga del Excel); DELETE existe únicamente para
 * corregir filas importadas por error (p. ej. archivo duplicado o corrupto).
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (session?.user?.role !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const existing = await prisma.ncRegistro.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: 'NC no encontrada' }, { status: 404 })
  }
  await prisma.ncRegistro.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
