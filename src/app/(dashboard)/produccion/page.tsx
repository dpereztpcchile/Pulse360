import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { LinesBoard } from './LinesBoard'
import { getDiaView } from '@/lib/capacidad/service'
import { appToday } from '@/lib/app-date'
import { dayBounds } from '@/lib/control-turno/service'
import { Factory } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProduccionPage() {
  await getServerSession(authOptions)

  const { start, end } = dayBounds(appToday())

  const lines = await prisma.productionLine.findMany({
    orderBy: { code: 'asc' },
    include: { orders: { where: { date: { gte: start, lte: end } }, select: { realKg: true } } },
  })

  // Carnicería: la producción del día deriva de los cortes (RegistroCorteCarniceria),
  // no de ProductionOrder. Tomamos todos los cortes del programa de hoy.
  const cortesHoy = await prisma.registroCorteCarniceria.findMany({
    where: { programa: { fecha: { gte: start, lte: end } } },
    select: { estado: true, prodReal: true, hhReales: true, kgMPReal: true, kgMPTeorico: true },
  })
  const completados = cortesHoy.filter((c) => c.estado === 'COMPLETADO')
  const carnEnProceso = cortesHoy.some((c) => c.estado === 'EN_PROCESO')
  const sumHH = completados.reduce((a, c) => a + (c.hhReales ?? 0), 0)
  const carniceriaProd = sumHH > 0
    ? Math.round((completados.reduce((a, c) => a + (c.prodReal ?? 0) * (c.hhReales ?? 0), 0) / sumHH) * 10) / 10
    : null

  // Kg de MATERIA PRIMA: real procesado hoy y plan total del programa,
  // para la barra "Producción vs plan".
  const carnKgRealMP = Math.round(completados.reduce((a, c) => a + (c.kgMPReal ?? 0), 0))
  const carnKgPlanMP = Math.round(cortesHoy.reduce((a, c) => a + (c.kgMPTeorico ?? 0), 0))

  // Resumen de capacidad del día para Carnicería (mismos datos que /capacidad)
  const diaCarn = await getDiaView(appToday())

  // Utilización de capacidad = Kg MP real procesados hoy / Capacidad del día × 100.
  // Sin capacidad configurada → null ("—"); sin cortes completados → 0%.
  const utilCapacidad = diaCarn && diaCarn.capacidadKgMP > 0
    ? Math.round((carnKgRealMP / diaCarn.capacidadKgMP) * 1000) / 10
    : null
  const capCarniceria = diaCarn ? {
    estado: diaCarn.estado,
    ocupacionPorc: diaCarn.ocupacionPorc,
    capacidadKgMP: diaCarn.capacidadKgMP,
    pedidoKgMP: diaCarn.pedidoKgMP,
    holguraKgMP: diaCarn.holguraKgMP,
    hasProgram: diaCarn.hasProgram,
  } : null

  // Estado por línea derivado de Control de Turno: OPERANDO si hay algún registro
  // EN_PROCESO hoy (botón Iniciar presionado y aún no Terminado); si no, DETENIDO.
  const registrosHoy = await prisma.registroProduccion.findMany({
    where: { fecha: { gte: start, lte: end } },
    select: { lineaId: true, estado: true, batches: { select: { estado: true } } },
  })
  const operandoByLine = new Map<string, boolean>()
  for (const r of registrosHoy) {
    if (r.estado === 'EN_PROCESO' || r.batches.some((b) => b.estado === 'EN_PROCESO')) {
      operandoByLine.set(r.lineaId, true)
    }
  }
  const lineaOperando = (l: { id: string; code: string }) =>
    l.code === 'CARNICERIA' ? carnEnProceso : (operandoByLine.get(l.id) ?? false)

  const data = lines.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    status: (lineaOperando(l) ? 'OPERANDO' : 'DETENIDO') as 'OPERANDO' | 'EN_OBSERVACION' | 'DETENIDO',
    dailyPlanKg: l.code === 'CARNICERIA' && carnKgPlanMP > 0 ? carnKgPlanMP : l.dailyPlanKg,
    oee: l.oee,
    utilization: l.utilization,
    dayKg: l.code === 'CARNICERIA' ? carnKgRealMP : l.orders.reduce((sum, o) => sum + o.realKg, 0),
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
      <LinesBoard initialLines={data} />
    </div>
  )
}
