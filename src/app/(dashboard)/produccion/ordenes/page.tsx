import { prisma } from '@/lib/prisma'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { OrdenesFabricacionClient, type OF } from './OrdenesFabricacionClient'
import { Factory } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OrdenesPage() {
  const ordenes = await prisma.ordenFabricacion.findMany({
    orderBy: [{ fecha: 'desc' }, { numeroOF: 'asc' }],
  })

  const serialized: OF[] = ordenes.map((o) => ({
    id: o.id,
    numeroOF: o.numeroOF,
    producto: o.producto,
    cantidadPlanificada: o.cantidadPlanificada,
    unidad: o.unidad,
    cantidadCompletada: o.cantidadCompletada,
    razonQuiebre: o.razonQuiebre,
    fecha: o.fecha.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Factory className="w-6 h-6 text-pulse-red" /> Producción
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Órdenes de Fabricación (cargadas desde SAP)</p>
      </div>

      <ProductionTabs />
      <OrdenesFabricacionClient initialOrdenes={serialized} />
    </div>
  )
}
