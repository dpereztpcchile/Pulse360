import { prisma } from '@/lib/prisma'
import { weeklyCapacityKg } from '@/lib/utils'

// ── Helpers de tiempo ─────────────────────────────────────

export interface ReportMeta {
  plant: string
  from: string
  to: string
  generatedAt: string
}

function ddmm(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysInclusive(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
}

/** Buckets diarios entre from y to (máx 62). */
function dayBuckets(from: Date, to: Date): Date[] {
  const out: Date[] = []
  const cur = new Date(from); cur.setHours(0, 0, 0, 0)
  const end = new Date(to); end.setHours(0, 0, 0, 0)
  while (cur <= end && out.length < 62) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Buckets semanales de 7 días desde from (máx 26). */
function weekBuckets(from: Date, to: Date): { label: string; start: Date; end: Date }[] {
  const out: { label: string; start: Date; end: Date }[] = []
  const cur = new Date(from); cur.setHours(0, 0, 0, 0)
  let i = 1
  while (cur <= to && out.length < 26) {
    const start = new Date(cur)
    const end = new Date(cur); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999)
    out.push({ label: `Sem ${i}`, start, end })
    cur.setDate(cur.getDate() + 7); i++
  }
  return out
}

async function getPlantName() {
  const p = await prisma.plant.findFirst()
  return p?.name ?? 'Planta Principal'
}

function meta(plant: string, from: Date, to: Date): ReportMeta {
  return { plant, from: from.toISOString(), to: to.toISOString(), generatedAt: new Date().toISOString() }
}

const round1 = (n: number) => Math.round(n * 10) / 10

// ═══════════════════════════════════════════════════════════
// A) REPORTE DE PRODUCCIÓN
// ═══════════════════════════════════════════════════════════

export interface ProductionReport {
  meta: ReportMeta
  kpis: { totalKg: number; compliancePct: number; productiveHours: number; stoppedHours: number; avgOee: number }
  oeeByLine: { line: string; oee: number }[]
  daily: { day: string; real: number; plan: number }[]
  byLine: { line: string; real: number; plan: number }[]
  stops: { cause: string; freq: number; minutes: number }[]
}

const STOP_CAUSES: { cause: string; baseMin: number; weight: number }[] = [
  { cause: 'Mantención no programada', baseMin: 120, weight: 0.15 },
  { cause: 'Falla mecánica',           baseMin: 95,  weight: 0.30 },
  { cause: 'Cambio de formato',        baseMin: 40,  weight: 0.20 },
  { cause: 'Falta de insumo',          baseMin: 55,  weight: 0.20 },
  { cause: 'Limpieza / sanitización',  baseMin: 35,  weight: 0.15 },
]

export async function getProductionReport(opts: { from: Date; to: Date; lineId?: string; shift?: string }): Promise<ProductionReport> {
  const { from, to } = opts
  const [plant, lines, orders] = await Promise.all([
    getPlantName(),
    prisma.productionLine.findMany({ orderBy: { code: 'asc' }, include: { capacity: true } }),
    prisma.productionOrder.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(opts.lineId ? { lineId: opts.lineId } : {}),
        ...(opts.shift ? { shift: opts.shift as 'MANANA' | 'TARDE' | 'NOCHE' } : {}),
      },
      include: { line: true },
    }),
  ])

  const totalReal = orders.reduce((a, o) => a + o.realKg, 0)
  const totalPlan = orders.reduce((a, o) => a + o.plannedKg, 0)
  const compliancePct = totalPlan > 0 ? round1((totalReal / totalPlan) * 100) : 0

  // OEE por línea (snapshot actual; filtra si se pidió una línea)
  const filteredLines = opts.lineId ? lines.filter((l) => l.id === opts.lineId) : lines
  const oeeByLine = filteredLines.map((l) => ({ line: l.code, oee: round1(l.oee) }))
  const activeOee = filteredLines.filter((l) => l.oee > 0)
  const avgOee = activeOee.length > 0 ? round1(activeOee.reduce((a, l) => a + l.oee, 0) / activeOee.length) : 0

  // Producción día a día
  const days = dayBuckets(from, to)
  const daily = days.map((d) => {
    const dayOrders = orders.filter((o) => {
      const od = new Date(o.date); od.setHours(0, 0, 0, 0)
      return od.getTime() === d.getTime()
    })
    return {
      day: ddmm(d),
      real: Math.round(dayOrders.reduce((a, o) => a + o.realKg, 0)),
      plan: Math.round(dayOrders.reduce((a, o) => a + o.plannedKg, 0)),
    }
  })

  // Producción por línea
  const byLineMap = new Map<string, { real: number; plan: number }>()
  for (const o of orders) {
    const key = o.line.code
    const cur = byLineMap.get(key) ?? { real: 0, plan: 0 }
    cur.real += o.realKg; cur.plan += o.plannedKg
    byLineMap.set(key, cur)
  }
  const byLine = filteredLines.map((l) => ({
    line: l.code,
    real: Math.round(byLineMap.get(l.code)?.real ?? 0),
    plan: Math.round(byLineMap.get(l.code)?.plan ?? 0),
  }))

  // Tabla de paradas (derivada de forma determinista de las órdenes detenidas/líneas detenidas)
  const detainedOrders = orders.filter((o) => o.status === 'DETENIDA').length
  const detainedLines = filteredLines.filter((l) => l.status === 'DETENIDO').length
  const totalStops = Math.max(detainedOrders + detainedLines * 2, 6)
  const stops = STOP_CAUSES.map((c) => {
    const freq = Math.max(1, Math.round(totalStops * c.weight))
    return { cause: c.cause, freq, minutes: freq * c.baseMin }
  }).sort((a, b) => b.minutes - a.minutes)

  // Horas productivas vs paradas
  const periodDays = daysInclusive(from, to)
  const scheduledHours = filteredLines.reduce((a, l) => {
    if (!l.capacity) return a
    return a + periodDays * l.capacity.hoursPerShift * l.capacity.activeShifts
  }, 0)
  const stoppedHours = round1(stops.reduce((a, s) => a + s.minutes, 0) / 60)
  const productiveHours = round1(Math.max(scheduledHours - stoppedHours, 0))

  return {
    meta: meta(plant, from, to),
    kpis: { totalKg: Math.round(totalReal), compliancePct, productiveHours, stoppedHours, avgOee },
    oeeByLine, daily, byLine, stops,
  }
}

// ═══════════════════════════════════════════════════════════
// B) REPORTE DE MATERIAS PRIMAS
// ═══════════════════════════════════════════════════════════

export interface MaterialsReport {
  meta: ReportMeta
  kpis: { totalConsumedKg: number; totalReceivedKg: number; stockAlerts: number; expiringLots: number }
  consumption: { material: string; code: string; qty: number; unit: string }[]
  stockEvolution: { week: string; stock: number }[]
  alerts: { material: string; createdAt: string; resolvedAt: string | null; durationMin: number | null; ongoing: boolean }[]
  suppliers: { supplier: string; receipts: number; qty: number }[]
  expiringLots: { material: string; lot: string; expiry: string; daysLeft: number; status: string }[]
}

export async function getMaterialsReport(opts: { from: Date; to: Date }): Promise<MaterialsReport> {
  const { from, to } = opts
  const [plant, materials, consumptions, receipts, stockAlerts] = await Promise.all([
    getPlantName(),
    prisma.material.findMany({ orderBy: { code: 'asc' } }),
    prisma.materialConsumption.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { material: true } }),
    prisma.materialReceipt.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { material: true } }),
    prisma.alert.findMany({ where: { module: 'MATERIAS_PRIMAS', type: 'STOCK_BAJO', createdAt: { gte: from, lte: to } } }),
  ])

  // Consumo por insumo
  const consMap = new Map<string, { material: string; code: string; qty: number; unit: string }>()
  for (const c of consumptions) {
    const k = c.materialId
    const cur = consMap.get(k) ?? { material: c.material.name, code: c.material.code, qty: 0, unit: c.material.unit }
    cur.qty += c.quantity
    consMap.set(k, cur)
  }
  const consumption = Array.from(consMap.values()).map((c) => ({ ...c, qty: Math.round(c.qty) })).sort((a, b) => b.qty - a.qty)
  const totalConsumedKg = Math.round(consumption.reduce((a, c) => a + c.qty, 0))
  const totalReceivedKg = Math.round(receipts.reduce((a, r) => a + r.quantity, 0))

  // Evolución de stock semana a semana (reconstrucción desde el stock actual hacia atrás)
  const totalCurrentStock = materials.reduce((a, m) => a + m.currentStock, 0)
  const weeks = weekBuckets(from, to)
  // Flujo neto por semana = ingresos - consumos de esa semana
  const netByWeek = weeks.map((w) => {
    const rec = receipts.filter((r) => r.createdAt >= w.start && r.createdAt <= w.end).reduce((a, r) => a + r.quantity, 0)
    const con = consumptions.filter((c) => c.createdAt >= w.start && c.createdAt <= w.end).reduce((a, c) => a + c.quantity, 0)
    return rec - con
  })
  // Camina hacia atrás: el stock al final de la última semana = stock actual
  const stockEnd: number[] = new Array(weeks.length).fill(0)
  let running = totalCurrentStock
  for (let i = weeks.length - 1; i >= 0; i--) {
    stockEnd[i] = Math.round(running)
    running -= netByWeek[i]
  }
  const stockEvolution = weeks.map((w, i) => ({ week: w.label, stock: Math.max(0, stockEnd[i]) }))

  // Alertas de stock ocurridas y su duración
  const alerts = stockAlerts.map((a) => {
    const ongoing = a.status !== 'RESUELTA' || !a.resolvedAt
    const durationMin = a.resolvedAt ? Math.round((a.resolvedAt.getTime() - a.createdAt.getTime()) / 60000) : null
    return { material: a.title.replace(/^Stock bajo:\s*/, ''), createdAt: a.createdAt.toISOString(), resolvedAt: a.resolvedAt?.toISOString() ?? null, durationMin, ongoing }
  })

  // Proveedores con más ingresos
  const supMap = new Map<string, { supplier: string; receipts: number; qty: number }>()
  for (const r of receipts) {
    const cur = supMap.get(r.supplier) ?? { supplier: r.supplier, receipts: 0, qty: 0 }
    cur.receipts += 1; cur.qty += r.quantity
    supMap.set(r.supplier, cur)
  }
  const suppliers = Array.from(supMap.values()).map((s) => ({ ...s, qty: Math.round(s.qty) })).sort((a, b) => b.qty - a.qty)

  // Lotes vencidos o próximos a vencer (cualquier ingreso con vencimiento ≤ 30 días o ya vencido)
  const now = new Date()
  const allReceipts = await prisma.materialReceipt.findMany({ where: { expiryDate: { not: null } }, include: { material: true } })
  const expiringLots = allReceipts
    .map((r) => {
      const daysLeft = Math.round((new Date(r.expiryDate!).getTime() - now.getTime()) / 86_400_000)
      return { material: r.material.name, lot: r.lot ?? 's/n', expiry: r.expiryDate!.toISOString(), daysLeft, status: daysLeft < 0 ? 'Vencido' : 'Próximo a vencer' }
    })
    .filter((r) => r.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return {
    meta: meta(plant, from, to),
    kpis: { totalConsumedKg, totalReceivedKg, stockAlerts: stockAlerts.length, expiringLots: expiringLots.length },
    consumption, stockEvolution, alerts, suppliers, expiringLots,
  }
}

// ═══════════════════════════════════════════════════════════
// C) REPORTE DE DESPACHO
// ═══════════════════════════════════════════════════════════

export interface DispatchReport {
  meta: ReportMeta
  kpis: { totalKg: number; guides: number; onTimePct: number }
  clients: { client: string; qty: number; guides: number }[]
  weekly: { week: string; qty: number }[]
}

export async function getDispatchReport(opts: { from: Date; to: Date }): Promise<DispatchReport> {
  const { from, to } = opts
  const [plant, dispatches] = await Promise.all([
    getPlantName(),
    prisma.dispatch.findMany({ where: { estimatedAt: { gte: from, lte: to } } }),
  ])

  const totalKg = Math.round(dispatches.reduce((a, d) => a + d.quantityKg, 0))
  const guides = dispatches.length
  const dispatched = dispatches.filter((d) => d.dispatchedAt != null)
  const onTime = dispatched.filter((d) => d.dispatchedAt! <= d.estimatedAt).length
  const onTimePct = dispatched.length > 0 ? round1((onTime / dispatched.length) * 100) : 0

  const clientMap = new Map<string, { client: string; qty: number; guides: number }>()
  for (const d of dispatches) {
    const cur = clientMap.get(d.client) ?? { client: d.client, qty: 0, guides: 0 }
    cur.qty += d.quantityKg; cur.guides += 1
    clientMap.set(d.client, cur)
  }
  const clients = Array.from(clientMap.values()).map((c) => ({ ...c, qty: Math.round(c.qty) })).sort((a, b) => b.qty - a.qty)

  const weeks = weekBuckets(from, to)
  const weekly = weeks.map((w) => ({
    week: w.label,
    qty: Math.round(dispatches.filter((d) => d.estimatedAt >= w.start && d.estimatedAt <= w.end).reduce((a, d) => a + d.quantityKg, 0)),
  }))

  return { meta: meta(plant, from, to), kpis: { totalKg, guides, onTimePct }, clients, weekly }
}

// ═══════════════════════════════════════════════════════════
// D) REPORTE DE NO CONFORMIDADES
// ═══════════════════════════════════════════════════════════

export interface NcReport {
  meta: ReportMeta
  kpis: { created: number; closed: number; overdue: number }
  byCategory: { name: string; value: number }[]
  bySeverity: { name: string; value: number }[]
  avgResolutionByArea: { area: string; days: number; count: number }[]
  areaRanking: { area: string; count: number }[]
}

const NC_CATEGORY_LABEL: Record<string, string> = { CALIDAD: 'Calidad', INOCUIDAD: 'Inocuidad', PROCESO: 'Proceso', PROVEEDOR: 'Proveedor' }
const NC_SEVERITY_LABEL: Record<string, string> = { CRITICA: 'Crítica', MAYOR: 'Mayor', MENOR: 'Menor' }

export async function getNcReport(opts: { from: Date; to: Date }): Promise<NcReport> {
  const { from, to } = opts
  const now = new Date()
  const [plant, inPeriod, closedInPeriod] = await Promise.all([
    getPlantName(),
    prisma.nonConformity.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.nonConformity.findMany({ where: { status: 'CERRADA', closedAt: { gte: from, lte: to } } }),
  ])

  const created = inPeriod.length
  const closed = closedInPeriod.length
  const overdue = inPeriod.filter((n) => n.status !== 'CERRADA' && new Date(n.dueDate) < now).length

  const catMap = new Map<string, number>()
  const sevMap = new Map<string, number>()
  const areaCount = new Map<string, number>()
  for (const n of inPeriod) {
    catMap.set(n.category, (catMap.get(n.category) ?? 0) + 1)
    sevMap.set(n.severity, (sevMap.get(n.severity) ?? 0) + 1)
    areaCount.set(n.area, (areaCount.get(n.area) ?? 0) + 1)
  }
  const byCategory = Array.from(catMap.entries()).map(([k, v]) => ({ name: NC_CATEGORY_LABEL[k] ?? k, value: v }))
  const bySeverity = ['CRITICA', 'MAYOR', 'MENOR'].map((k) => ({ name: NC_SEVERITY_LABEL[k], value: sevMap.get(k) ?? 0 }))

  // Tiempo promedio de resolución por área (sobre NC cerradas en el período)
  const areaRes = new Map<string, { totalDays: number; count: number }>()
  for (const n of closedInPeriod) {
    if (!n.closedAt) continue
    const days = (n.closedAt.getTime() - n.createdAt.getTime()) / 86_400_000
    const cur = areaRes.get(n.area) ?? { totalDays: 0, count: 0 }
    cur.totalDays += days; cur.count += 1
    areaRes.set(n.area, cur)
  }
  const avgResolutionByArea = Array.from(areaRes.entries())
    .map(([area, v]) => ({ area, days: round1(v.totalDays / v.count), count: v.count }))
    .sort((a, b) => b.days - a.days)

  const areaRanking = Array.from(areaCount.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count)

  return { meta: meta(plant, from, to), kpis: { created, closed, overdue }, byCategory, bySeverity, avgResolutionByArea, areaRanking }
}

// ═══════════════════════════════════════════════════════════
// E) REPORTE DE CAPACIDAD VS DEMANDA
// ═══════════════════════════════════════════════════════════

export interface CapacityReport {
  meta: ReportMeta
  byLine: { line: string; avgOccupation: number; critical: boolean }[]
  weekly: { week: string; capacidad: number; demanda: number; occupation: number; critical: boolean }[]
  criticalWeeks: number
}

export async function getCapacityReport(opts: { from: Date; to: Date }): Promise<CapacityReport> {
  const { from, to } = opts
  const [plant, lines, plans] = await Promise.all([
    getPlantName(),
    prisma.productionLine.findMany({ orderBy: { code: 'asc' }, include: { capacity: true } }),
    prisma.demandPlan.findMany(),
  ])

  // Capacidad semanal por línea (constante en el período)
  const capByLine = new Map<string, number>()
  let totalWeeklyCap = 0
  for (const l of lines) {
    const cap = l.capacity ? weeklyCapacityKg(l.capacity.kgPerHour, l.capacity.hoursPerShift, l.capacity.activeShifts, l.capacity.efficiency) : 0
    capByLine.set(l.id, cap)
    totalWeeklyCap += cap
  }

  // Cada plan (year, month, week) → fecha representativa; filtra los que caen en el rango
  const inRange = plans.filter((p) => {
    const repr = new Date(p.year, p.month - 1, (p.week - 1) * 7 + 1)
    return repr >= from && repr <= to
  })

  // Agrupar por semana (clave year-month-week)
  const weekKeys = Array.from(new Set(inRange.map((p) => `${p.year}-${p.month}-${p.week}`))).sort()
  const weekly = weekKeys.map((key, idx) => {
    const cells = inRange.filter((p) => `${p.year}-${p.month}-${p.week}` === key)
    const demanda = Math.round(cells.reduce((a, c) => a + c.demandKg, 0))
    const occupation = totalWeeklyCap > 0 ? Math.round((demanda / totalWeeklyCap) * 100) : 0
    return { week: `Sem ${idx + 1}`, capacidad: Math.round(totalWeeklyCap), demanda, occupation, critical: occupation > 90 }
  })

  // Ocupación promedio por línea
  const byLine = lines.map((l) => {
    const cap = capByLine.get(l.id) ?? 0
    const cells = inRange.filter((p) => p.lineId === l.id)
    const occs = cells.map((c) => (cap > 0 ? (c.demandKg / cap) * 100 : 0))
    const avg = occs.length > 0 ? round1(occs.reduce((a, b) => a + b, 0) / occs.length) : 0
    return { line: l.code, avgOccupation: avg, critical: avg > 90 }
  })

  const criticalWeeks = weekly.filter((w) => w.critical).length

  return { meta: meta(plant, from, to), byLine, weekly, criticalWeeks }
}
