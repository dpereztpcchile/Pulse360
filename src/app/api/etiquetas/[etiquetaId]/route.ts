import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { etiquetaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const registro = await prisma.registroEtiquetado.findUnique({
    where: { id: params.etiquetaId },
    include: {
      fotos: { select: { id: true, tipo: true, url: true, timestamp: true, operador: true } },
      checklist: { orderBy: { orden: 'asc' } },
      analisisIA: true,
      firmas: { orderBy: { firmadoEn: 'asc' } },
    },
  })

  if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  return NextResponse.json(registro)
}

export async function PATCH(req: NextRequest, { params }: { params: { etiquetaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const allowed = ['observaciones', 'motivoRechazo']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  const registro = await prisma.registroEtiquetado.update({ where: { id: params.etiquetaId }, data })
  return NextResponse.json(registro)
}
