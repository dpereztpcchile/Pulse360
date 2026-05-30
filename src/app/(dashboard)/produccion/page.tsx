import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { LinesBoard } from './LinesBoard'
import { getDiaView } from '@/lib/capacidad/service'
import { Factory } from 'lucide-react'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const dynamic = 'force-dynamic'

export default async function ProduccionPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  const lines = await prisma.productionLine.findMany({
    orderBy: { code: 'asc' },
    include: { orders: { where: { date: { gte: start, lte: end } }, select: { realKg: true } } },
  })

  // Carnicería: la producción del día deriva de los cortes (RegistroCorteCarniceria),
  // no de ProductionOrder. Tomamos todos los cortes del programa de hoy.
  const cortesHoy = await prisma.registroCorteCarniceria.findMany({
    where: { programa: { fecha: { gte: start, lte: end } } },
    select: { estado: true, prodReal: true, hhReales: true, kgMPReal: true, kgPTReal: true, kgPTPlan: true },
  })
  const completados = cortesHoy.filter((c) => c.estado === 'COMPLETADO')
  const sumHH = completados.reduce((a, c) => a + (c.hhReales ?? 0), 0)
  const carniceriaProd = sumHH > 0
    ? Math.round((completados.reduce((a, c) => a + (c.prodReal ?? 0) * (c.hhReales ?? 0), 0) / sumHH) * 10) / 10
    : null

  // Kg producidos hoy (PT) y plan total del programa, para la barra "Producción vs plan".
  const carnKgRealPT = Math.round(completados.reduce((a, c) => a + (c.kgPTReal ?? 0), 0))
  const carnKgPlanPT = Math.round(cortesHoy.reduce((a, c) => a + (c.kgPTPlan ?? 0), 0))

  // Resumen de capacidad del día para Carnicería (mismos datos que /capacidad)
  const diaCarn = await getDiaView(todayStr())

  // Utilización de capacidad = Kg MP real procesados hoy / Capacidad del día × 100.
  // Sin capacidad configurada → null ("—"); sin cortes completados → 0%.
  const sumKgMPReal = completados.reduce((a, c) => a + (c.kgMPReal ?? 0), 0)
  const utilCapacidad = diaCarn && diaCarn.capacidadKgMP > 0
    ? Math.round((sumKgMPReal / diaCarn.capacidadKgMP) * 1000) / 10
    : null
  const capCarniceria = diaCarn ? {
    estado: diaCarn.estado,
    ocupacionPorc: diaCarn.ocupacionPorc,
    capacidadKgMP: diaCarn.capacidadKgMP,
    pedidoKgMP: diaCarn.pedidoKgMP,
    holguraKgMP: diaCarn.holguraKgMP,
    hasProgram: diaCarn.hasProgram,
  } : null

  const data = lines.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    status: l.status,
    dailyPlanKg: l.code === 'CARNICERIA' && carnKgPlanPT > 0 ? carnKgPlanPT : l.dailyPlanKg,
    oee: l.oee,
    utilization: l.utilization,
    dayKg: l.code === 'CARNICERIA' ? carnKgRealPT : l.orders.reduce((sum, o) => sum + o.realKg, 0),
    prodRealKgHH: l.code === 'CARNICERIA' ? carniceriaProd : null,
    cap: l.code === 'CARNICERIA' ? capCarniceria : null,
    utilCapacidad: l.code === 'CARNICERIA' ? utilCapacidad : null,
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
      <LinesBoard initialLines={data} role={role} />
    </div>
  )
}
