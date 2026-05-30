import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { ResumenTurno } from '@/components/produccion/control-turno/ResumenTurno'
import { getResumen } from '@/lib/control-turno/service'
import { GaugeCircle, CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

const VALID = ['MANANA', 'TARDE', 'NOCHE']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function ControlTurnoPage({ searchParams }: { searchParams: { turno?: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user?.name ?? 'Usuario'

  const turno = VALID.includes(searchParams.turno ?? '') ? searchParams.turno! : 'MANANA'
  const fecha = todayStr()

  const [resumen, plant] = await Promise.all([
    getResumen(fecha, turno),
    prisma.plant.findFirst({ select: { name: true } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GaugeCircle className="w-6 h-6 text-pulse-red" /> Producción
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Control de turno</p>
      </div>

      <ProductionTabs />

      <div className="flex items-center gap-1.5 text-sm text-[#999]">
        <CalendarDays className="w-4 h-4 text-pulse-red" /> {fecha}
      </div>

      <ResumenTurno resumen={resumen} fecha={fecha} turno={turno} plant={plant?.name ?? 'Planta'} user={user} />
    </div>
  )
}
