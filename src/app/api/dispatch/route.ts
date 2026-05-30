import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'

const VALID_STATUS = ['PREPARANDO', 'LISTO', 'DESPACHADO', 'ENTREGADO']

export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const client = searchParams.get('client')
  const status = searchParams.get('status')
  const date = searchParams.get('date')

  const where: Record<string, unknown> = {}
  if (client) where.client = { contains: client, mode: 'insensitive' }
  if (status && VALID_STATUS.includes(status)) where.status = status
  if (date) {
    const d = new Date(date)
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    where.estimatedAt = { gte: start, lte: end }
  }

  const dispatches = await prisma.dispatch.findMany({
    where,
    include: { order: { select: { orderNumber: true } } },
    orderBy: { guideNumber: 'desc' },
  })

  return NextResponse.json(dispatches)
}

/** Crear guía: solo Administrador y Supervisor. */
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para crear guías' }, { status: 403 })
  }

  const body = await req.json()
  const { guideNumber, client, product, quantityKg, transporter, plate, clientPO, orderId, estimatedAt, observations } = body

  if (!client?.trim() || !product?.trim() || !transporter?.trim()) {
    return NextResponse.json({ error: 'Cliente, producto y transportista son obligatorios' }, { status: 400 })
  }
  const qty = Number(quantityKg)
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
  }

  // Número de guía: el provisto o uno secuencial GD-YYYY-####
  let guide = guideNumber?.trim()
  if (guide) {
    const exists = await prisma.dispatch.findUnique({ where: { guideNumber: guide } })
    if (exists) return NextResponse.json({ error: 'Ya existe una guía con ese número' }, { status: 409 })
  } else {
    const year = new Date().getFullYear()
    const count = await prisma.dispatch.count()
    guide = `GD-${year}-${String(count + 1).padStart(4, '0')}`
  }

  const dispatch = await prisma.dispatch.create({
    data: {
      guideNumber: guide,
      client: client.trim(),
      product: product.trim(),
      quantityKg: qty,
      transporter: transporter.trim(),
      plate: plate?.trim() || null,
      clientPO: clientPO?.trim() || null,
      orderId: orderId || null,
      estimatedAt: estimatedAt ? new Date(estimatedAt) : new Date(),
      observations: observations?.trim() || null,
      status: 'PREPARANDO',
    },
  })

  return NextResponse.json({ id: dispatch.id, guideNumber: dispatch.guideNumber }, { status: 201 })
}
