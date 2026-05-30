import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'
import { computeMaterialState } from '@/lib/utils'

const VALID_CATEGORIES = ['REFRIGERADO', 'CONGELADO', 'IMPORTADO', 'EN_TRANSITO']

/** Lista de insumos con estado y vencimiento próximo calculados. */
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const where: Record<string, unknown> = {}
  if (category && VALID_CATEGORIES.includes(category)) where.category = category

  const materials = await prisma.material.findMany({
    where,
    include: {
      receipts: { where: { expiryDate: { not: null } }, select: { expiryDate: true }, orderBy: { expiryDate: 'asc' } },
    },
    orderBy: { name: 'asc' },
  })

  const data = materials.map((m) => {
    const nearestExpiry = m.receipts[0]?.expiryDate ?? null
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      category: m.category,
      unit: m.unit,
      currentStock: m.currentStock,
      minStock: m.minStock,
      dailyUsageKg: m.dailyUsageKg,
      nearestExpiry: nearestExpiry ? nearestExpiry.toISOString() : null,
      state: computeMaterialState(m.currentStock, m.minStock, nearestExpiry),
    }
  })

  return NextResponse.json(data)
}

/** Crear insumo: solo Administrador y Supervisor. */
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para crear insumos' }, { status: 403 })
  }

  const body = await req.json()
  const { name, code, category, unit, minStock, dailyUsageKg } = body

  if (!name?.trim() || !code?.trim()) {
    return NextResponse.json({ error: 'Nombre y código son obligatorios' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const exists = await prisma.material.findUnique({ where: { code: code.trim() } })
  if (exists) {
    return NextResponse.json({ error: 'Ya existe un insumo con ese código' }, { status: 409 })
  }

  const material = await prisma.material.create({
    data: {
      name: name.trim(),
      code: code.trim(),
      category,
      unit: unit?.trim() || 'kg',
      minStock: Number(minStock) || 0,
      dailyUsageKg: Number(dailyUsageKg) || 0,
    },
  })

  return NextResponse.json({ id: material.id }, { status: 201 })
}
