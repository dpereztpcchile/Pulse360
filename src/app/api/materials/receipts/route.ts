import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'

/** Historial de ingresos. */
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const materialId = searchParams.get('materialId')
  const where: Record<string, unknown> = {}
  if (materialId) where.materialId = materialId

  const receipts = await prisma.materialReceipt.findMany({
    where,
    include: { material: { select: { name: true, code: true, unit: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(receipts)
}

/** Registrar ingreso: suma al stock del insumo (transacción). Admin y Supervisor. */
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para registrar ingresos' }, { status: 403 })
  }

  const body = await req.json()
  const { materialId, supplier, quantity, lot, expiryDate, entryTemp, receivedBy } = body

  if (!materialId || !supplier?.trim() || !receivedBy?.trim()) {
    return NextResponse.json({ error: 'Insumo, proveedor y responsable son obligatorios' }, { status: 400 })
  }
  const qty = Number(quantity)
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } })
  if (!material) {
    return NextResponse.json({ error: 'Insumo no encontrado' }, { status: 404 })
  }

  const [receipt] = await prisma.$transaction([
    prisma.materialReceipt.create({
      data: {
        materialId,
        supplier: supplier.trim(),
        quantity: qty,
        lot: lot?.trim() || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        entryTemp: entryTemp === '' || entryTemp == null ? null : Number(entryTemp),
        receivedBy: receivedBy.trim(),
      },
    }),
    prisma.material.update({
      where: { id: materialId },
      data: { currentStock: { increment: qty } },
    }),
  ])

  return NextResponse.json({ id: receipt.id }, { status: 201 })
}
