import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DispatchTabs } from '@/components/despacho/DispatchTabs'
import { DispatchClient } from './DispatchClient'
import { Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DespachoPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  const [dispatches, orders] = await Promise.all([
    prisma.dispatch.findMany({
      where: { estimatedAt: { gte: start, lte: end } },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { estimatedAt: 'asc' },
    }),
    prisma.productionOrder.findMany({
      where: { status: { in: ['PLANIFICADA', 'EN_PROCESO', 'COMPLETADA'] } },
      orderBy: { orderNumber: 'desc' },
      select: { id: true, orderNumber: true, product: true },
    }),
  ])

  const serialized = dispatches.map((d) => ({
    id: d.id,
    guideNumber: d.guideNumber,
    client: d.client,
    product: d.product,
    quantityKg: d.quantityKg,
    transporter: d.transporter,
    plate: d.plate,
    clientPO: d.clientPO,
    orderId: d.orderId,
    orderNumber: d.order?.orderNumber ?? null,
    estimatedAt: d.estimatedAt.toISOString(),
    dispatchedAt: d.dispatchedAt ? d.dispatchedAt.toISOString() : null,
    deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    status: d.status,
    observations: d.observations,
  }))

  // ── KPIs del día ──
  const despachadoHoy = serialized
    .filter((d) => d.status === 'DESPACHADO' || d.status === 'ENTREGADO')
    .reduce((s, d) => s + d.quantityKg, 0)
  const guiasEmitidas = serialized.length
  const pendientes = serialized.filter((d) => d.status === 'PREPARANDO' || d.status === 'LISTO').length
  const entregadas = serialized.filter((d) => d.status === 'ENTREGADO').length

  const kpis = { despachadoHoy, guiasEmitidas, pendientes, entregadas }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Truck className="w-6 h-6 text-pulse-red" /> Despacho
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Guías de despacho y salidas de bodega</p>
      </div>

      <DispatchTabs />
      <DispatchClient initialDispatches={serialized} orders={orders} kpis={kpis} role={role} />
    </div>
  )
}
