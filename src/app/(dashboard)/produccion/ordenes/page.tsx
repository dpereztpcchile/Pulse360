import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { OrdersClient } from './OrdersClient'
import { Factory } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OrdenesPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const [orders, lines] = await Promise.all([
    prisma.productionOrder.findMany({
      include: { line: { select: { name: true, code: true } } },
      orderBy: { orderNumber: 'desc' },
    }),
    prisma.productionLine.findMany({ orderBy: { code: 'asc' }, select: { id: true, name: true } }),
  ])

  const serialized = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    product: o.product,
    lineId: o.lineId,
    lineName: o.line.name,
    shift: o.shift,
    date: o.date.toISOString(),
    plannedKg: o.plannedKg,
    realKg: o.realKg,
    status: o.status,
    responsible: o.responsible,
    observations: o.observations,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Factory className="w-6 h-6 text-pulse-red" /> Producción
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Estado de líneas y órdenes de producción</p>
      </div>

      <ProductionTabs />
      <OrdersClient initialOrders={serialized} lines={lines} role={role} />
    </div>
  )
}
