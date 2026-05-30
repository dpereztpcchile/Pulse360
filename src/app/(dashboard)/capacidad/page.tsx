import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Gauge } from 'lucide-react'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { CapacidadLineTabs } from '@/components/capacidad/carniceria/CapacidadLineTabs'
import { SubViewTabs } from '@/components/capacidad/carniceria/SubViewTabs'
import { DiaView } from '@/components/capacidad/carniceria/DiaView'
import { HistoricoClient } from '@/components/capacidad/carniceria/HistoricoClient'
import { getDiaView, getHistorico } from '@/lib/capacidad/service'

export const dynamic = 'force-dynamic'

const ALLOWED = ['ADMINISTRADOR', 'SUPERVISOR']

export default async function CapacidadPage({ searchParams }: { searchParams: { vista?: string } }) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Gauge className="w-6 h-6 text-pulse-red" /> Capacidad
      </h1>
      <p className="text-sm text-[#666] mt-0.5">Ocupación por línea: capacidad instalada frente al pedido del día</p>
    </div>
  )

  if (!ALLOWED.includes(role)) {
    return <div className="space-y-6">{header}<AccessDenied /></div>
  }

  const vista: 'dia' | 'historico' = searchParams.vista === 'historico' ? 'historico' : 'dia'

  return (
    <div className="space-y-6">
      {header}
      <CapacidadLineTabs />
      <SubViewTabs vista={vista} />
      {vista === 'historico' ? (
        <HistoricoClient initial={await getHistorico('2sem', 'todos')} />
      ) : (
        await (async () => {
          const data = await getDiaView(null)
          if (!data) return <div className="card text-center text-[#555] py-10">No se encontró la línea Carnicería.</div>
          return <DiaView data={data} />
        })()
      )}
    </div>
  )
}
