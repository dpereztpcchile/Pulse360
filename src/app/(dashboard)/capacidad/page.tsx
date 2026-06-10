import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Gauge } from 'lucide-react'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { CapacidadLineTabs } from '@/components/capacidad/carniceria/CapacidadLineTabs'
import { SubViewTabs } from '@/components/capacidad/carniceria/SubViewTabs'
import { DiaView } from '@/components/capacidad/carniceria/DiaView'
import { HistoricoClient } from '@/components/capacidad/carniceria/HistoricoClient'
import { SemanalClient } from '@/components/capacidad/SemanalClient'
import { HorariosClient } from '@/components/capacidad/HorariosClient'
import { SaturacionClient } from '@/components/capacidad/SaturacionClient'
import { getDiaView, getHistorico } from '@/lib/capacidad/service'
import { getLineasConfig } from '@/lib/capacidad'
import { appToday } from '@/lib/app-date'

export const dynamic = 'force-dynamic'

const ALLOWED = ['ADMINISTRADOR', 'SUPERVISOR']

function rangoUlt4Semanas(today: string) {
  const [y, m, d] = today.split('-').map(Number)
  const hastaD = new Date(y, m - 1, d)
  const desdeD = new Date(y, m - 1, d - 28)
  const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  return { desde: ymd(desdeD), hasta: ymd(hastaD) }
}

export default async function CapacidadPage({ searchParams }: { searchParams: { vista?: string } }) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Gauge className="w-6 h-6 text-pulse-red" /> Capacidad
      </h1>
      <p className="text-sm text-[#666] mt-0.5">Capacidad instalada por línea y día, frente a la demanda planificada</p>
    </div>
  )

  if (!ALLOWED.includes(role)) {
    return <div className="space-y-6">{header}<AccessDenied /></div>
  }

  const isAdmin = role === 'ADMINISTRADOR'
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'
  let vista: 'semanal' | 'saturacion' | 'dia' | 'historico' | 'horarios' =
    searchParams.vista === 'dia' ? 'dia' : searchParams.vista === 'historico' ? 'historico'
      : searchParams.vista === 'horarios' ? 'horarios' : searchParams.vista === 'saturacion' ? 'saturacion' : 'semanal'
  if (vista === 'horarios' && !isAdmin) vista = 'semanal' // pestaña solo ADMIN

  const today = appToday()
  const { desde, hasta } = rangoUlt4Semanas(today)

  return (
    <div className="space-y-6">
      {header}
      <SubViewTabs vista={vista} isAdmin={isAdmin} />

      {vista === 'horarios' ? (
        <HorariosClient lineas={await getLineasConfig()} isAdmin={isAdmin} />
      ) : vista === 'saturacion' ? (
        <SaturacionClient today={today} canManage={canManage} />
      ) : vista === 'semanal' ? (
        <SemanalClient today={today} />
      ) : vista === 'historico' ? (
        <>
          <CapacidadLineTabs />
          <HistoricoClient initial={await getHistorico({ desde, hasta, estado: 'todos' })} desde={desde} hasta={hasta} />
        </>
      ) : (
        <>
          <CapacidadLineTabs />
          {await (async () => {
            const data = await getDiaView(null)
            if (!data) return <div className="card text-center text-[#555] py-10">No se encontró la línea Carnicería.</div>
            return <DiaView data={data} />
          })()}
        </>
      )}
    </div>
  )
}
