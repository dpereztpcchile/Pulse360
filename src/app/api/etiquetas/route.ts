import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateRegistroDTO, CHECKLIST_ITEMS, generarCodigoRegistro } from '@/types/etiquetado'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const fecha = searchParams.get('fecha')
  const linea = searchParams.get('linea')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  if (fecha) {
    const inicio = new Date(fecha)
    const fin = new Date(fecha)
    fin.setHours(23, 59, 59, 999)
    where.fecha = { gte: inicio, lte: fin }
  }
  if (linea) where.lineaProceso = linea

  const [registros, total] = await Promise.all([
    prisma.registroEtiquetado.findMany({
      where, orderBy: { creadoEn: 'desc' },
      skip: (page - 1) * limit, take: limit,
      include: {
        fotos: { select: { id: true, tipo: true, url: true, timestamp: true } },
        firmas: { select: { rol: true, nombreUsuario: true, firmadoEn: true, esRechazo: true } },
        analisisIA: { select: { confianza: true, itemsAprobados: true, itemsNC: true } },
        checklist: { select: { itemKey: true, resultado: true } },
      },
    }),
    prisma.registroEtiquetado.count({ where }),
  ])

  return NextResponse.json({ registros, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body: CreateRegistroDTO = await req.json()
  const required = ['lineaProceso', 'producto', 'lote', 'fechaElaboracion', 'fechaVencimiento', 'maquinista']
  for (const field of required) {
    if (!body[field as keyof CreateRegistroDTO])
      return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 })
  }

  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const fin = new Date(inicio); fin.setHours(23, 59, 59, 999)
  const countHoy = await prisma.registroEtiquetado.count({ where: { creadoEn: { gte: inicio, lte: fin } } })
  const codigo = generarCodigoRegistro(hoy, countHoy + 1)

  const registro = await prisma.registroEtiquetado.create({
    data: {
      codigo, estado: 'BORRADOR',
      lineaProceso: body.lineaProceso, producto: body.producto,
      lote: body.lote, fechaElaboracion: new Date(body.fechaElaboracion),
      fechaVencimiento: new Date(body.fechaVencimiento),
      fechaFaena: body.fechaFaena ? new Date(body.fechaFaena) : null,
      frigorifico: body.frigorifico, origen: body.origen,
      precio: body.precio, maquinista: body.maquinista,
      creadoPor: session.user.id,
      checklist: {
        create: CHECKLIST_ITEMS.map((item, idx) => ({
          itemKey: item.key, itemNombre: item.nombre,
          resultado: 'C' as const, orden: idx + 1,
        })),
      },
    },
    include: { checklist: true, fotos: true, firmas: true },
  })

  return NextResponse.json(registro, { status: 201 })
}
