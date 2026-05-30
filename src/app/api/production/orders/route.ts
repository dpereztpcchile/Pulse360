import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'

const VALID_SHIFTS = ['MANANA', 'TARDE', 'NOCHE']

export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const lineId = searchParams.get('lineId')
  const shift = searchParams.get('shift')
  const status = searchParams.get('status')
  const date = searchParams.get('date')

  const where: Record<string, unknown> = {}
  if (lineId) where.lineId = lineId
  if (shift) where.shift = shift
  if (status) where.status = status
  if (date) {
    const d = new Date(date)
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    where.date = { gte: start, lte: end }
  }

  const orders = await prisma.productionOrder.findMany({
    where,
    include: { line: { select: { name: true, code: true } } },
    orderBy: { orderNumber: 'desc' },
  })

  return NextResponse.json(orders)
}

// Crear orden: solo Administrador y Supervisor
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para crear órdenes' }, { status: 403 })
  }

  const body = await req.json()
  const { product, lineId, shift, date, plannedKg, responsible, observations } = body

  if (!product?.trim() || !lineId || !responsible?.trim()) {
    return NextResponse.json({ error: 'Producto, línea y responsable son obligatorios' }, { status: 400 })
  }
  if (!VALID_SHIFTS.includes(shift)) {
    return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })
  }
  const planned = Number(plannedKg)
  if (!planned || planned <= 0) {
    return NextResponse.json({ error: 'La cantidad planificada debe ser mayor a 0' }, { status: 400 })
  }

  // Generar número de orden secuencial
  const year = new Date().getFullYear()
  const count = await prisma.productionOrder.count()
  const orderNumber = `OP-${year}-${String(count + 1).padStart(4, '0')}`

  const order = await prisma.productionOrder.create({
    data: {
      orderNumber,
      product: product.trim(),
      lineId,
      shift,
      date: date ? new Date(date) : new Date(),
      plannedKg: planned,
      responsible: responsible.trim(),
      observations: observations?.trim() || null,
      status: 'PLANIFICADA',
    },
  })

  return NextResponse.json({ id: order.id, orderNumber: order.orderNumber }, { status: 201 })
}
