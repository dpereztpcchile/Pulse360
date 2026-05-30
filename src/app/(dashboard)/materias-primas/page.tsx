import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MaterialsTabs } from '@/components/materias/MaterialsTabs'
import { InventoryClient } from './InventoryClient'
import { computeMaterialState } from '@/lib/utils'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MateriasPrimasPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  const [materials, todayReceipts] = await Promise.all([
    prisma.material.findMany({
      orderBy: { name: 'asc' },
      include: {
        receipts: { where: { expiryDate: { not: null } }, select: { expiryDate: true }, orderBy: { expiryDate: 'asc' }, take: 1 },
      },
    }),
    prisma.materialReceipt.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { quantity: true },
    }),
  ])

  const serialized = materials.map((m) => {
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

  // ── KPIs ──
  const stockTotal = serialized.reduce((s, m) => s + m.currentStock, 0)
  const withUsage = serialized.filter((m) => m.dailyUsageKg > 0)
  const avgCoverage = withUsage.length
    ? Math.round(withUsage.reduce((s, m) => s + m.currentStock / m.dailyUsageKg, 0) / withUsage.length)
    : 0
  const ingresosHoy = todayReceipts.reduce((s, r) => s + r.quantity, 0)
  const enAlerta = serialized.filter((m) => m.state !== 'OK').length

  const kpis = { stockTotal, avgCoverage, ingresosHoy, enAlerta }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-pulse-red" /> Materias Primas
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Inventario y control de stock</p>
      </div>

      <MaterialsTabs />
      <InventoryClient initialMaterials={serialized} kpis={kpis} role={role} />
    </div>
  )
}
