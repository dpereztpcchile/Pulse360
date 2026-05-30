import { prisma } from '@/lib/prisma'
import { weeklyCapacityKg, weekOfMonth } from '@/lib/utils'

export interface DashboardLine {
  id: string
  name: string
  code: string
  status: 'OPERANDO' | 'EN_OBSERVACION' | 'DETENIDO'
  oee: number
  utilization: number
  producedToday: number
  product: string | null
}

export interface DashboardAlert {
  type: 'stop' | 'warn' | 'ok'
  msg: string
  time: string
}

export interface CapDemandRow {
  line: string
  capacidad: number
  demanda: number
  pct: number
  over: boolean
}

export interface DashboardData {
  // KPIs
  nsDay: { value: number; plan: number; deltaPct: number }
  realProd: { value: number; variancePct: number }
  capacityUsedPct: number
  dispatchesKg: number
  reprocesoPct: { value: number; deltaPp: number }
  quiebres: number
  oee: number
  temp: { value: number; minsAgo: number }
  // Secciones
  lines: DashboardLine[]
  alerts: DashboardAlert[]
  activeAlerts: number
  nsWeekly: { day: string; real: number; plan: number }[]
  capDemand: CapDemandRow[]
  reprocesoSeries: { t: string; pct: number }[]
  lossesUsd: number
  lossesBars: number[]
}

function hhmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(date)
}

/**
 * Agrega los datos del dashboard operacional desde la base de datos.
 * Las métricas con respaldo real (producción, despachos, OEE, capacidad, líneas,
 * quiebres, alertas, capacidad-vs-demanda) se calculan desde la DB. Las métricas
 * sin modelo histórico (serie NS semanal, serie de reproceso, pérdidas, deltas vs
 * ayer) se derivan de forma determinista a partir de los datos reales para la demo.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1)

  const [lines, ordersToday, dispatchesToday, materials, openNcs] = await Promise.all([
    prisma.productionLine.findMany({
      orderBy: { code: 'asc' },
      include: {
        capacity: true,
        orders: { where: { date: { gte: startToday, lt: endToday } } },
      },
    }),
    prisma.productionOrder.findMany({ where: { date: { gte: startToday, lt: endToday } } }),
    prisma.dispatch.findMany({ where: { estimatedAt: { gte: startToday, lt: endToday } } }),
    prisma.material.findMany(),
    prisma.nonConformity.findMany({ where: { status: { not: 'CERRADA' } } }),
  ])

  // ── Producción del día ──
  const totalReal = ordersToday.reduce((a, o) => a + o.realKg, 0)
  const totalPlan = ordersToday.reduce((a, o) => a + o.plannedKg, 0)
  const variancePct = totalPlan > 0 ? Math.round(((totalReal - totalPlan) / totalPlan) * 1000) / 10 : 0
  // Baseline "ayer" determinista (92% del plan) para mostrar delta vs ayer en la demo.
  const prodAyer = Math.round(totalPlan * 0.92) || 1
  const deltaPct = Math.round(((totalReal - prodAyer) / prodAyer) * 1000) / 10

  // ── Capacidad utilizada ──
  const dailyCapacity = lines.reduce((a, l) => {
    if (!l.capacity) return a
    return a + weeklyCapacityKg(l.capacity.kgPerHour, l.capacity.hoursPerShift, l.capacity.activeShifts, l.capacity.efficiency) / 7
  }, 0)
  const capacityUsedPct = dailyCapacity > 0
    ? Math.min(100, Math.round((totalReal / dailyCapacity) * 100))
    : Math.round(lines.reduce((a, l) => a + l.utilization, 0) / Math.max(lines.length, 1))

  // ── Despachos del día ──
  const dispatchesKg = Math.round(dispatchesToday.reduce((a, d) => a + d.quantityKg, 0))

  // ── OEE global (líneas operando) ──
  const operating = lines.filter((l) => l.status === 'OPERANDO')
  const oee = operating.length > 0
    ? Math.round((operating.reduce((a, l) => a + l.oee, 0) / operating.length) * 10) / 10
    : 0

  // ── Quiebres de stock (materiales bajo mínimo) ──
  const belowMin = materials.filter((m) => m.currentStock < m.minStock)
  const quiebres = belowMin.length

  // ── Reproceso (%) — derivado determinista del desvío plan/real ──
  const reprocesoPctVal = totalPlan > 0
    ? Math.round((Math.abs(totalPlan - totalReal) / totalPlan) * 100 * 0.35 * 10) / 10
    : 0
  const reprocesoPct = { value: reprocesoPctVal, deltaPp: Math.round((reprocesoPctVal - 2.6) * 10) / 10 }

  // ── Temperatura promedio (último ingreso con temperatura) ──
  const lastTemp = await prisma.materialReceipt.findFirst({
    where: { entryTemp: { not: null } },
    orderBy: { createdAt: 'desc' },
  })
  const temp = {
    value: lastTemp?.entryTemp != null ? Math.round(lastTemp.entryTemp * 10) / 10 : 4.0,
    minsAgo: lastTemp ? Math.max(1, Math.round((now.getTime() - lastTemp.createdAt.getTime()) / 60000)) : 0,
  }

  // ── Líneas (pulso operacional) ──
  const dashLines: DashboardLine[] = lines.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    status: l.status,
    oee: Math.round(l.oee * 10) / 10,
    utilization: Math.round(l.utilization),
    producedToday: Math.round(l.orders.reduce((a, o) => a + o.realKg, 0)),
    product: l.orders.find((o) => o.status === 'EN_PROCESO')?.product ?? l.orders[0]?.product ?? null,
  }))

  // ── Alertas en tiempo real ──
  const alerts: DashboardAlert[] = []
  for (const l of lines.filter((x) => x.status === 'DETENIDO')) {
    alerts.push({ type: 'stop', msg: `${l.name} detenida`, time: hhmm(l.updatedAt) })
  }
  for (const l of lines.filter((x) => x.status === 'EN_OBSERVACION')) {
    alerts.push({ type: 'warn', msg: `${l.name} en observación`, time: hhmm(l.updatedAt) })
  }
  for (const m of belowMin) {
    alerts.push({ type: 'warn', msg: `Stock bajo mínimo: ${m.name} (${Math.round(m.currentStock)} ${m.unit})`, time: hhmm(m.updatedAt) })
  }
  for (const nc of openNcs.filter((n) => n.dueDate < now)) {
    alerts.push({ type: 'stop', msg: `NC vencida ${nc.ncNumber}: ${nc.title}`, time: hhmm(nc.createdAt) })
  }
  alerts.sort((a, b) => (a.type === 'stop' ? -1 : 1) - (b.type === 'stop' ? -1 : 1))
  const activeAlerts = alerts.filter((a) => a.type !== 'ok').length

  // ── NS semanal (real rojo vs plan gris) — serie determinista ──
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const planDaily = totalPlan || 12000
  const realFactors = [0.94, 0.97, 1.02, 0.99, 1.05, 0.88, 0.91]
  const nsWeekly = dayLabels.map((day, i) => ({
    day,
    plan: Math.round(planDaily),
    real: Math.round(planDaily * realFactors[i]),
  }))

  // ── Capacidad vs Demanda (semana en curso) ──
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const week = weekOfMonth(now)
  const plans = await prisma.demandPlan.findMany({ where: { year, month, week } })
  const demandMap: Record<string, number> = {}
  for (const p of plans) demandMap[p.lineId] = p.demandKg
  const capDemand: CapDemandRow[] = lines.map((l) => {
    const cap = l.capacity ? weeklyCapacityKg(l.capacity.kgPerHour, l.capacity.hoursPerShift, l.capacity.activeShifts, l.capacity.efficiency) : 0
    const dem = demandMap[l.id] ?? 0
    const pct = cap > 0 ? Math.round((dem / cap) * 100) : 0
    return { line: l.code, capacidad: Math.round(cap), demanda: Math.round(dem), pct, over: pct > 90 }
  })

  // ── Serie de reproceso (%) determinista ──
  const reproFactors = [2.1, 2.8, 2.4, 3.1, 2.6, 2.2, reprocesoPctVal || 2.5]
  const reprocesoSeries = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((t, i) => ({
    t, pct: Math.round(reproFactors[i] * 10) / 10,
  }))

  // ── Pérdidas estimadas ($) — derivadas de reproceso + quiebres ──
  const lossesUsd = Math.round((reprocesoPctVal * 320 + quiebres * 1500 + (alerts.filter((a) => a.type === 'stop').length) * 2200))
  const lossesBars = [0.6, 0.8, 0.5, 0.9, 0.7, 0.55, 1].map((f) => Math.round(lossesUsd * f))

  return {
    nsDay: { value: Math.round(totalReal), plan: Math.round(totalPlan), deltaPct },
    realProd: { value: Math.round(totalReal), variancePct },
    capacityUsedPct,
    dispatchesKg,
    reprocesoPct,
    quiebres,
    oee,
    temp,
    lines: dashLines,
    alerts: alerts.slice(0, 8),
    activeAlerts,
    nsWeekly,
    capDemand,
    reprocesoSeries,
    lossesUsd,
    lossesBars,
  }
}
