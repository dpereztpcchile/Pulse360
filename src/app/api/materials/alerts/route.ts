import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'
import { computeMaterialState } from '@/lib/utils'

/** Conteo de insumos en alerta (bajo mínimo o próximos a vencer) para el badge del sidebar. */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const materials = await prisma.material.findMany({
    include: {
      receipts: { where: { expiryDate: { not: null } }, select: { expiryDate: true }, orderBy: { expiryDate: 'asc' }, take: 1 },
    },
  })

  let belowMin = 0
  let expiring = 0
  for (const m of materials) {
    const state = computeMaterialState(m.currentStock, m.minStock, m.receipts[0]?.expiryDate ?? null)
    if (state === 'BAJO_MINIMO') belowMin++
    else if (state === 'PROXIMO_A_VENCER') expiring++
  }

  return NextResponse.json({ total: belowMin + expiring, belowMin, expiring })
}
