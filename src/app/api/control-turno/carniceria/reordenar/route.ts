import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'

// POST → guarda el nuevo orden de los cortes del turno. Body: { programaId, ids: string[] }
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para reordenar' }, { status: 403 })
  }
  const body = await req.json()
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: 'Sin orden válido' }, { status: 400 })

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.registroCorteCarniceria.update({ where: { id }, data: { orden: i + 1 } }),
    ),
  )
  return NextResponse.json({ ok: true })
}
