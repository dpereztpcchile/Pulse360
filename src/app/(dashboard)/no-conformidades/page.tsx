import { prisma } from '@/lib/prisma'
import { NcTabs } from '@/components/no-conformidades/NcTabs'
import { NcClient } from './NcClient'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NoConformidadesPage() {
  const ncs = await prisma.ncRegistro.findMany({ orderBy: { ncNumber: 'desc' } })

  const serialized = ncs.map((n) => ({
    id: n.id,
    ncNumber: n.ncNumber,
    fecha: n.fecha.toISOString(),
    semana: n.semana,
    producto: n.producto,
    razon: n.razon,
    cantidadKg: n.cantidadKg,
    valorNcOC: n.valorNcOC,
    valorVentaNc: n.valorVentaNc,
    destino: n.destino,
    responsable: n.responsable,
    proveedor: n.proveedor,
    estadoNc: n.estadoNc,
    gestionado: n.gestionado,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-pulse-red" /> No Conformidades
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Registro y seguimiento de NC cárnicas (carga desde Excel)</p>
      </div>

      <NcTabs />
      <NcClient initialNcs={serialized} />
    </div>
  )
}
