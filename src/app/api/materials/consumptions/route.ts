import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'

/** Historial de consumos. */
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const materialId = searchParams.get('materialId')
  const where: Record<string, unknown> = {}
  if (materialId) where.materialId = materialId

  const consumptions = await prisma.materialConsumption.findMany({
    where,
    include: {
      material: { select: { name: true, code: true, unit: true } },
      order: { select: { orderNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(consumptions)
}

/** Registrar consumo: descuenta del stock. Todos los roles (operador incluido). */
export async function POST(req: Request) {
  const session = await requireRole(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'])
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { materialId, quantity, orderId, usage, consumedBy } = body

  if (!materialId || !consumedBy?.trim()) {
    return NextResponse.json({ error: 'Insumo y responsable son obligatorios' }, { status: 400 })
  }
  const qty = Number(quantity)
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
  }
  if (!orderId && !usage?.trim()) {
    return NextResponse.json({ error: 'Indica una orden de producción o un uso general' }, { status: 400 })
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } })
  if (!material) {
    return NextResponse.json({ error: 'Insumo no encontrado' }, { status: 404 })
  }
  if (qty > material.currentStock) {
    return NextResponse.json(
      { error: `Stock insuficiente: disponible ${material.currentStock} ${material.unit}` },
      { status: 400 }
    )
  }

  const [consumption] = await prisma.$transaction([
    prisma.materialConsumption.create({
      data: {
        materialId,
        quantity: qty,
        orderId: orderId || null,
        usage: usage?.trim() || null,
        consumedBy: consumedBy.trim(),
      },
    }),
    prisma.material.update({
      where: { id: materialId },
      data: { currentStock: { decrement: qty } },
    }),
  ])

  return NextResponse.json({ id: consumption.id }, { status: 201 })
}
