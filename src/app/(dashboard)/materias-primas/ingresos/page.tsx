import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MaterialsTabs } from '@/components/materias/MaterialsTabs'
import { IngresosClient } from './IngresosClient'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function IngresosPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const [materials, orders, receipts, consumptions] = await Promise.all([
    prisma.material.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, unit: true, currentStock: true } }),
    prisma.productionOrder.findMany({
      where: { status: { in: ['PLANIFICADA', 'EN_PROCESO'] } },
      orderBy: { orderNumber: 'desc' },
      select: { id: true, orderNumber: true, product: true },
    }),
    prisma.materialReceipt.findMany({
      include: { material: { select: { name: true, code: true, unit: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
    prisma.materialConsumption.findMany({
      include: { material: { select: { name: true, unit: true } }, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
  ])

  const receiptsSer = receipts.map((r) => ({
    id: r.id,
    materialName: r.material.name,
    materialCode: r.material.code,
    unit: r.material.unit,
    supplier: r.supplier,
    quantity: r.quantity,
    lot: r.lot,
    expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
    entryTemp: r.entryTemp,
    receivedBy: r.receivedBy,
    createdAt: r.createdAt.toISOString(),
  }))

  const consumptionsSer = consumptions.map((c) => ({
    id: c.id,
    materialName: c.material.name,
    unit: c.material.unit,
    quantity: c.quantity,
    orderNumber: c.order?.orderNumber ?? null,
    usage: c.usage,
    consumedBy: c.consumedBy,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-pulse-red" /> Materias Primas
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Registro de ingresos y consumos de inventario</p>
      </div>

      <MaterialsTabs />
      <IngresosClient
        materials={materials}
        orders={orders}
        receipts={receiptsSer}
        consumptions={consumptionsSer}
        userName={session?.user?.name ?? ''}
        role={role}
      />
    </div>
  )
}
