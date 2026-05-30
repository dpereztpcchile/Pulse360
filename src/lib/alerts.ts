import { prisma } from '@/lib/prisma'
import { weeklyCapacityKg, weekOfMonth, tempRangeFor, daysUntil } from '@/lib/utils'
import type { AlertModule, AlertSeverity, Alert } from '@prisma/client'

/** Configuración efectiva de umbrales (con valores por defecto si no hay fila). */
export interface EffectiveConfig {
  oeeMinDefault: number
  expiryWarningDays: number
  dispatchDelayHours: number
  capacityOverPct: number
  enableLineStopped: boolean
  enableOeeLow: boolean
  enableShiftNoRecord: boolean
  enableStockLow: boolean
  enableExpiry: boolean
  enableTempRange: boolean
  enableDispatchDelay: boolean
  enableDispatchNoTransporter: boolean
  enableNcCritical: boolean
  enableNcOverdue: boolean
  enableCapacityOver: boolean
}

const DEFAULT_CONFIG: EffectiveConfig = {
  oeeMinDefault: 65,
  expiryWarningDays: 7,
  dispatchDelayHours: 2,
  capacityOverPct: 90,
  enableLineStopped: true,
  enableOeeLow: true,
  enableShiftNoRecord: true,
  enableStockLow: true,
  enableExpiry: true,
  enableTempRange: true,
  enableDispatchDelay: true,
  enableDispatchNoTransporter: true,
  enableNcCritical: true,
  enableNcOverdue: true,
  enableCapacityOver: true,
}

/** Obtiene la configuración (singleton) o la crea con valores por defecto. */
export async function getOrCreateConfig() {
  const existing = await prisma.alertConfig.findFirst()
  if (existing) return existing
  return prisma.alertConfig.create({ data: {} })
}

interface DesiredAlert {
  sourceKey: string
  module: AlertModule
  type: string
  severity: AlertSeverity
  title: string
  description: string
  responsible: string | null
}

/**
 * Calcula el conjunto de alertas que DEBERÍAN existir según el estado actual de
 * los demás módulos, las concilia con la base (crea las nuevas, actualiza las
 * existentes y auto-resuelve las que ya no aplican) y devuelve la configuración usada.
 *
 * Es idempotente: ejecutarla varias veces no genera duplicados porque las alertas
 * activas/reconocidas se identifican por `sourceKey`.
 */
export async function generateAlerts(): Promise<void> {
  const cfg = await getOrCreateConfig()
  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1)

  const [lines, materials, dispatches, ncs] = await Promise.all([
    prisma.productionLine.findMany({
      include: {
        capacity: true,
        orders: { where: { date: { gte: startToday, lt: endToday } } },
      },
    }),
    prisma.material.findMany({
      include: { receipts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.dispatch.findMany({ where: { status: { in: ['PREPARANDO', 'LISTO'] } } }),
    prisma.nonConformity.findMany({ where: { status: { not: 'CERRADA' } } }),
  ])

  const desired: DesiredAlert[] = []

  // ── PRODUCCIÓN ──
  for (const l of lines) {
    if (cfg.enableLineStopped && l.status === 'DETENIDO') {
      desired.push({
        sourceKey: `PROD:LINE_STOPPED:${l.id}`,
        module: 'PRODUCCION', type: 'LINEA_DETENIDA', severity: 'CRITICA',
        title: `${l.name} detenida`,
        description: `La línea ${l.code} se encuentra detenida. Requiere intervención para reanudar la producción.`,
        responsible: 'Jefe de Producción',
      })
    }
    const oeeMin = l.oeeMin ?? cfg.oeeMinDefault
    if (cfg.enableOeeLow && l.status === 'OPERANDO' && l.oee < oeeMin) {
      desired.push({
        sourceKey: `PROD:OEE_LOW:${l.id}`,
        module: 'PRODUCCION', type: 'OEE_BAJO', severity: 'ADVERTENCIA',
        title: `OEE bajo en ${l.name}`,
        description: `El OEE de ${l.code} es ${l.oee.toFixed(1)}%, por debajo del umbral mínimo (${oeeMin}%).`,
        responsible: 'Supervisor de Línea',
      })
    }
    if (cfg.enableShiftNoRecord && l.status !== 'DETENIDO' && l.orders.length === 0) {
      desired.push({
        sourceKey: `PROD:NO_SHIFT_RECORD:${l.id}`,
        module: 'PRODUCCION', type: 'TURNO_SIN_REGISTRO', severity: 'INFORMATIVA',
        title: `Turno sin registro en ${l.name}`,
        description: `La línea ${l.code} no tiene órdenes de producción registradas para el turno de hoy.`,
        responsible: 'Supervisor de Línea',
      })
    }
  }

  // ── MATERIAS PRIMAS ──
  for (const m of materials) {
    if (cfg.enableStockLow && m.currentStock < m.minStock) {
      const critical = m.currentStock <= m.minStock * 0.5
      desired.push({
        sourceKey: `MP:STOCK_LOW:${m.id}`,
        module: 'MATERIAS_PRIMAS', type: 'STOCK_BAJO',
        severity: critical ? 'CRITICA' : 'ADVERTENCIA',
        title: `Stock bajo: ${m.name}`,
        description: `${m.name} (${m.code}) tiene ${Math.round(m.currentStock)} ${m.unit}, bajo el mínimo de ${Math.round(m.minStock)} ${m.unit}.`,
        responsible: 'Encargado de Bodega',
      })
    }
    const lastReceipt = m.receipts[0]
    if (cfg.enableExpiry && lastReceipt?.expiryDate) {
      const days = daysUntil(lastReceipt.expiryDate)
      if (days !== null && days <= cfg.expiryWarningDays) {
        desired.push({
          sourceKey: `MP:EXPIRY:${m.id}`,
          module: 'MATERIAS_PRIMAS', type: 'VENCIMIENTO_PROXIMO',
          severity: days <= 0 ? 'CRITICA' : 'ADVERTENCIA',
          title: days <= 0 ? `Insumo vencido: ${m.name}` : `Vencimiento próximo: ${m.name}`,
          description: days <= 0
            ? `El lote ${lastReceipt.lot ?? 's/n'} de ${m.name} está vencido.`
            : `El lote ${lastReceipt.lot ?? 's/n'} de ${m.name} vence en ${days} día${days === 1 ? '' : 's'}.`,
          responsible: 'Encargado de Bodega',
        })
      }
    }
    if (cfg.enableTempRange && lastReceipt?.entryTemp != null) {
      const range = tempRangeFor(m.category)
      if (range && (lastReceipt.entryTemp < range.min || lastReceipt.entryTemp > range.max)) {
        desired.push({
          sourceKey: `MP:TEMP:${m.id}`,
          module: 'MATERIAS_PRIMAS', type: 'TEMP_FUERA_RANGO', severity: 'ADVERTENCIA',
          title: `Temperatura fuera de rango: ${m.name}`,
          description: `El último ingreso de ${m.name} registró ${lastReceipt.entryTemp}°C (rango permitido: ${range.min}°C a ${range.max}°C).`,
          responsible: 'Control de Calidad',
        })
      }
    }
  }

  // ── DESPACHO ──
  const delayMs = cfg.dispatchDelayHours * 3600_000
  for (const d of dispatches) {
    if (cfg.enableDispatchDelay && now.getTime() - new Date(d.estimatedAt).getTime() > delayMs) {
      desired.push({
        sourceKey: `DESP:DELAY:${d.id}`,
        module: 'DESPACHO', type: 'GUIA_RETRASADA', severity: 'CRITICA',
        title: `Despacho retrasado: ${d.guideNumber}`,
        description: `La guía ${d.guideNumber} (${d.client}) superó su hora estimada de despacho en más de ${cfg.dispatchDelayHours}h.`,
        responsible: d.transporter || 'Coordinador de Despacho',
      })
    }
    if (cfg.enableDispatchNoTransporter && (!d.transporter || d.transporter.trim() === '')) {
      desired.push({
        sourceKey: `DESP:NO_TRANSPORTER:${d.id}`,
        module: 'DESPACHO', type: 'SIN_TRANSPORTISTA', severity: 'ADVERTENCIA',
        title: `Despacho sin transportista: ${d.guideNumber}`,
        description: `La guía ${d.guideNumber} (${d.client}) está pendiente y no tiene transportista asignado.`,
        responsible: 'Coordinador de Despacho',
      })
    }
  }

  // ── NO CONFORMIDADES ──
  for (const nc of ncs) {
    if (cfg.enableNcCritical && nc.severity === 'CRITICA') {
      desired.push({
        sourceKey: `NC:CRITICAL_OPEN:${nc.id}`,
        module: 'NO_CONFORMIDADES', type: 'NC_CRITICA_ABIERTA', severity: 'CRITICA',
        title: `NC crítica abierta: ${nc.ncNumber}`,
        description: `${nc.title} — no conformidad crítica sin cerrar (estado: ${nc.status}).`,
        responsible: nc.responsible,
      })
    }
    if (cfg.enableNcOverdue && new Date(nc.dueDate).getTime() < now.getTime()) {
      desired.push({
        sourceKey: `NC:OVERDUE:${nc.id}`,
        module: 'NO_CONFORMIDADES', type: 'NC_VENCIDA', severity: 'CRITICA',
        title: `NC vencida: ${nc.ncNumber}`,
        description: `${nc.title} — superó su fecha límite y aún no se cierra.`,
        responsible: nc.responsible,
      })
    }
  }

  // ── CAPACIDAD ──
  if (cfg.enableCapacityOver) {
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const week = weekOfMonth(now)
    const plans = await prisma.demandPlan.findMany({ where: { year, month, week } })
    const demandMap: Record<string, number> = {}
    for (const p of plans) demandMap[p.lineId] = p.demandKg
    for (const l of lines) {
      if (!l.capacity) continue
      const cap = weeklyCapacityKg(l.capacity.kgPerHour, l.capacity.hoursPerShift, l.capacity.activeShifts, l.capacity.efficiency)
      const dem = demandMap[l.id] ?? 0
      const pct = cap > 0 ? Math.round((dem / cap) * 100) : 0
      if (pct > cfg.capacityOverPct) {
        desired.push({
          sourceKey: `CAP:OVER:${l.id}`,
          module: 'CAPACIDAD', type: 'OCUPACION_ALTA', severity: 'ADVERTENCIA',
          title: `Línea sobrecargada: ${l.name}`,
          description: `${l.code} tiene una ocupación de ${pct}% esta semana (umbral: ${cfg.capacityOverPct}%).`,
          responsible: 'Planificación',
        })
      }
    }
  }

  // ── Conciliación con la base ──
  const existing = await prisma.alert.findMany({ where: { status: { in: ['ACTIVA', 'RECONOCIDA'] } } })
  const existingByKey = new Map(existing.map((a) => [a.sourceKey, a]))
  const desiredKeys = new Set(desired.map((d) => d.sourceKey))

  const ops = []
  for (const d of desired) {
    const ex = existingByKey.get(d.sourceKey)
    if (!ex) {
      ops.push(prisma.alert.create({ data: { ...d, status: 'ACTIVA' } }))
    } else {
      // Mantiene status/reconocimiento; sólo refresca el contenido descriptivo.
      ops.push(prisma.alert.update({
        where: { id: ex.id },
        data: { severity: d.severity, title: d.title, description: d.description, responsible: d.responsible },
      }))
    }
  }
  for (const ex of existing) {
    if (!desiredKeys.has(ex.sourceKey)) {
      ops.push(prisma.alert.update({
        where: { id: ex.id },
        data: {
          status: 'RESUELTA', autoResolved: true, resolvedBy: 'Sistema',
          resolvedAt: now, resolutionNote: 'Condición normalizada automáticamente',
        },
      }))
    }
  }
  if (ops.length > 0) await prisma.$transaction(ops)
}

export interface ActiveAlertDTO {
  id: string
  module: AlertModule
  type: string
  severity: AlertSeverity
  status: 'ACTIVA' | 'RECONOCIDA'
  title: string
  description: string
  responsible: string | null
  createdAt: string
  acknowledgedBy: string | null
}

export interface ActiveAlertsResult {
  alerts: ActiveAlertDTO[]
  counts: { CRITICA: number; ADVERTENCIA: number; INFORMATIVA: number }
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { CRITICA: 0, ADVERTENCIA: 1, INFORMATIVA: 2 }

/** Alertas activas + reconocidas, ordenadas por severidad y luego por hora (recientes primero). */
export async function getActiveAlerts(opts: { module?: string; onlyCritical?: boolean; onlyUnacknowledged?: boolean } = {}): Promise<ActiveAlertsResult> {
  const all = await prisma.alert.findMany({ where: { status: { in: ['ACTIVA', 'RECONOCIDA'] } } })

  const counts = { CRITICA: 0, ADVERTENCIA: 0, INFORMATIVA: 0 }
  for (const a of all) counts[a.severity] += 1

  let filtered = all
  if (opts.onlyCritical) filtered = filtered.filter((a) => a.severity === 'CRITICA')
  if (opts.onlyUnacknowledged) filtered = filtered.filter((a) => a.status === 'ACTIVA')
  if (opts.module) filtered = filtered.filter((a) => a.module === opts.module)

  filtered.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (s !== 0) return s
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return {
    counts,
    alerts: filtered.map((a) => ({
      id: a.id, module: a.module, type: a.type, severity: a.severity,
      status: a.status as 'ACTIVA' | 'RECONOCIDA',
      title: a.title, description: a.description, responsible: a.responsible,
      createdAt: a.createdAt.toISOString(),
      acknowledgedBy: a.acknowledgedBy,
    })),
  }
}

/** Conteo rápido para el badge del sidebar (regenera primero para mantener fresco). */
export async function getAlertCounts(): Promise<{ critical: number; total: number }> {
  const all = await prisma.alert.findMany({
    where: { status: { in: ['ACTIVA', 'RECONOCIDA'] } },
    select: { severity: true },
  })
  return {
    critical: all.filter((a) => a.severity === 'CRITICA').length,
    total: all.length,
  }
}

export interface HistoryRow {
  id: string
  createdAt: string
  resolvedAt: string | null
  module: AlertModule
  type: string
  title: string
  description: string
  severity: AlertSeverity
  acknowledgedBy: string | null
  resolvedBy: string | null
  responseMs: number | null
  autoResolved: boolean
}

export interface HistoryResult {
  rows: HistoryRow[]
  kpis: { avgResponseMs: number | null; criticalThisMonth: number; pctResolvedUnderHour: number | null }
}

function responseMsOf(a: Alert): number | null {
  if (!a.resolvedAt) return null
  return a.resolvedAt.getTime() - a.createdAt.getTime()
}

/** Historial de alertas resueltas con filtros opcionales y KPIs del mes en curso. */
export async function getAlertHistory(opts: { from?: Date; to?: Date; module?: string; severity?: string } = {}): Promise<HistoryResult> {
  const where: Record<string, unknown> = { status: 'RESUELTA' }
  if (opts.module) where.module = opts.module
  if (opts.severity) where.severity = opts.severity
  if (opts.from || opts.to) {
    where.resolvedAt = {
      ...(opts.from ? { gte: opts.from } : {}),
      ...(opts.to ? { lte: opts.to } : {}),
    }
  }

  const resolved = await prisma.alert.findMany({ where, orderBy: { resolvedAt: 'desc' }, take: 500 })

  // KPIs del mes en curso (independientes de los filtros de tabla).
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthResolved = await prisma.alert.findMany({
    where: { status: 'RESUELTA', resolvedAt: { gte: monthStart } },
  })
  const monthCriticalAll = await prisma.alert.count({
    where: { severity: 'CRITICA', createdAt: { gte: monthStart } },
  })

  const responseTimes = monthResolved.map(responseMsOf).filter((n): n is number => n !== null)
  const avgResponseMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null
  const underHour = responseTimes.filter((ms) => ms <= 3600_000).length
  const pctResolvedUnderHour = responseTimes.length > 0
    ? Math.round((underHour / responseTimes.length) * 100)
    : null

  return {
    rows: resolved.map((a) => ({
      id: a.id,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      module: a.module, type: a.type, title: a.title, description: a.description,
      severity: a.severity, acknowledgedBy: a.acknowledgedBy, resolvedBy: a.resolvedBy,
      responseMs: responseMsOf(a), autoResolved: a.autoResolved,
    })),
    kpis: { avgResponseMs, criticalThisMonth: monthCriticalAll, pctResolvedUnderHour },
  }
}
