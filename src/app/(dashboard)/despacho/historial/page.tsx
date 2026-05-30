import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DispatchTabs } from '@/components/despacho/DispatchTabs'
import { HistorialClient } from './HistorialClient'
import { Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  await getServerSession(authOptions)

  const dispatches = await prisma.dispatch.findMany({
    include: { order: { select: { orderNumber: true } } },
    orderBy: { estimatedAt: 'desc' },
    take: 500,
  })

  const serialized = dispatches.map((d) => ({
    id: d.id,
    guideNumber: d.guideNumber,
    client: d.client,
    product: d.product,
    quantityKg: d.quantityKg,
    transporter: d.transporter,
    plate: d.plate,
    clientPO: d.clientPO,
    orderNumber: d.order?.orderNumber ?? null,
    estimatedAt: d.estimatedAt.toISOString(),
    dispatchedAt: d.dispatchedAt ? d.dispatchedAt.toISOString() : null,
    deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    status: d.status,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Truck className="w-6 h-6 text-pulse-red" /> Despacho
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Historial completo de guías de despacho</p>
      </div>

      <DispatchTabs />
      <HistorialClient dispatches={serialized} />
    </div>
  )
}
