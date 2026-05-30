// PULSE 360 — Control de Turno: lógica de servidor compartida (páginas + APIs).
import { prisma } from '@/lib/prisma'
import { getTurnoLine, LINE_CATALOG } from './config'
import { computeOee, type OeeInput, type OeeResult } from './oee'
import type { RegistroProduccion, RegistroBatch } from '@prisma/client'

export type RegistroConBatches = RegistroProduccion & { batches: RegistroBatch[] }

/** Límites [00:00, 23:59:59] de una fecha YYYY-MM-DD (o hoy). */
export function dayBounds(fechaStr?: string | null) {
  const base = fechaStr ? new Date(fechaStr + 'T00:00:00') : new Date()
  const start = new Date(base); start.setHours(0, 0, 0, 0)
  const end = new Date(base); end.setHours(23, 59, 59, 999)
  return { start, end, day: start }
}

/** Kg reales efectivos de un registro: molienda suma batches completados; resto usa kgReal. */
export function effectiveKgReal(reg: RegistroConBatches): number {
  if (reg.batches && reg.batches.length > 0) {
    return reg.batches
      .filter((b) => b.estado === 'COMPLETADO')
      .reduce((a, b) => a + (b.kgBatch || 0), 0)
  }
  return reg.kgReal ?? 0
}

/**
 * Arma el input de OEE agregado para una línea a partir de sus registros del turno.
 * Devuelve null si la línea no calcula OEE.
 */
export function buildOeeInput(
  lineCode: string,
  registros: RegistroConBatches[],
  totalParadasMin: number,
): OeeInput | null {
  const line = getTurnoLine(lineCode)
  if (!line || !line.oeeEnabled) return null

  const kgReal = registros.reduce((a, r) => a + effectiveKgReal(r), 0)
  const kgPlan = registros.reduce((a, r) => a + (r.kgPlan || 0), 0)

  // Capacidad nominal: Carnicería = 100 Kg/HH × dotación del turno
  let capacidadNominal = line.nominalKgHr
  if (line.variant === 'CARNICERIA') {
    const dotacion = registros.reduce((max, r) => Math.max(max, r.dotacion ?? 0), 0) || 1
    capacidadNominal = line.nominalKgHr * dotacion
  }

  // Rendimiento teórico ponderado por kg plan
  let teoPesoSum = 0
  let teoSum = 0
  let kgMpTotal = 0
  for (const r of registros) {
    if (r.rendTeoricoPorc && r.rendTeoricoPorc > 0) {
      teoSum += r.rendTeoricoPorc * (r.kgPlan || 0)
      teoPesoSum += r.kgPlan || 0
      kgMpTotal += (r.kgPlan || 0) / (r.rendTeoricoPorc / 100)
    }
  }
  const rendTeoricoPct = teoPesoSum > 0 ? teoSum / teoPesoSum : null
  // Rendimiento real: kg salida / kg MP (si hay teórico); si no, kgReal/kgPlan
  const rendRealPct = kgMpTotal > 0
    ? (kgReal / kgMpTotal) * 100
    : kgPlan > 0 ? (kgReal / kgPlan) * 100 : null

  return {
    kgReal,
    kgPlan,
    capacidadNominal,
    totalParadasMin,
    rendRealPct,
    rendTeoricoPct,
  }
}

/** Suma de minutos de paradas de una línea en una fecha/turno. */
export async function totalParadasMin(lineId: string, start: Date, end: Date, turno: string): Promise<number> {
  const paradas = await prisma.paradaTurno.findMany({
    where: { lineaId: lineId, fecha: { gte: start, lte: end }, turno: turno as never },
    select: { duracionMin: true },
  })
  return paradas.reduce((a, p) => a + (p.duracionMin || 0), 0)
}

/**
 * Recalcula el OEE de una línea para una fecha/turno, lo persiste en OEETurno
 * y actualiza ProductionLine.oee (para alimentar el Dashboard). Devuelve el resultado.
 */
export async function recomputeAndPersistOee(
  lineId: string,
  lineCode: string,
  fecha: Date,
  turno: string,
): Promise<OeeResult | null> {
  const start = new Date(fecha); start.setHours(0, 0, 0, 0)
  const end = new Date(fecha); end.setHours(23, 59, 59, 999)

  const registros = await prisma.registroProduccion.findMany({
    where: { lineaId: lineId, fecha: { gte: start, lte: end }, turno: turno as never },
    include: { batches: true },
  })
  const paradasMin = await totalParadasMin(lineId, start, end, turno)

  const input = buildOeeInput(lineCode, registros, paradasMin)
  if (!input) return null

  const result = computeOee(input)

  await prisma.oEETurno.upsert({
    where: { lineaId_fecha_turno: { lineaId: lineId, fecha: start, turno: turno as never } },
    create: {
      lineaId: lineId, fecha: start, turno: turno as never,
      disponibilidad: result.disponibilidad, rendimiento: result.rendimiento, calidad: result.calidad,
      oee: result.oee, totalParadasMin: result.totalParadasMin, kgReal: result.produccionReal,
      kgTeorico: result.produccionTeoricaMax, capacidadNominal: result.capacidadNominal,
      clasificacion: result.clasificacion.key,
    },
    update: {
      disponibilidad: result.disponibilidad, rendimiento: result.rendimiento, calidad: result.calidad,
      oee: result.oee, totalParadasMin: result.totalParadasMin, kgReal: result.produccionReal,
      kgTeorico: result.produccionTeoricaMax, capacidadNominal: result.capacidadNominal,
      clasificacion: result.clasificacion.key,
    },
  })

  // Alimentar el widget OEE del Dashboard
  await prisma.productionLine.update({ where: { id: lineId }, data: { oee: result.oee } })

  return result
}

export interface ResumenLinea {
  code: string
  name: string
  lineId: string | null
  variant: string
  oeeEnabled: boolean
  hasProgram: boolean
  kgPlan: number
  kgReal: number
  cumplimientoPct: number
  oee: number | null
  clasificacion: string | null
  estado: 'Sin programa' | 'Pendiente' | 'En proceso' | 'Completada' | 'Detenida'
  totalRegistros: number
  completados: number
  ncCount: number
}

/** Resumen de turno: una fila por cada línea del catálogo Control de Turno. */
export async function getResumen(fechaStr?: string | null, turno = 'MANANA'): Promise<ResumenLinea[]> {
  const { start, end } = dayBounds(fechaStr)

  const lines = await prisma.productionLine.findMany({
    where: { code: { in: LINE_CATALOG.map((l) => l.code) } },
    select: { id: true, code: true, name: true, status: true },
  })
  const lineByCode = Object.fromEntries(lines.map((l) => [l.code, l]))

  const registros = await prisma.registroProduccion.findMany({
    where: { fecha: { gte: start, lte: end }, turno: turno as never },
    include: { batches: true },
  })
  const regsByLine = new Map<string, RegistroConBatches[]>()
  for (const r of registros) {
    const arr = regsByLine.get(r.lineaId) ?? []
    arr.push(r as RegistroConBatches)
    regsByLine.set(r.lineaId, arr)
  }

  const oeeRows = await prisma.oEETurno.findMany({ where: { fecha: { gte: start, lte: end }, turno: turno as never } })
  const oeeByLine = Object.fromEntries(oeeRows.map((o) => [o.lineaId, o]))

  // Carnicería usa su propio modelo (productividad sobre MP bruta)
  const programaCarn = await prisma.programaCarniceria.findFirst({
    where: { fecha: { gte: start, lte: end }, turno: turno as never },
    include: { cortes: true },
  })

  // NC creadas hoy (integración: alerta por línea)
  const ncs = await prisma.nonConformity.findMany({
    where: { createdAt: { gte: start, lte: end }, status: { not: 'CERRADA' } },
    select: { area: true, title: true, description: true },
  })

  return LINE_CATALOG.map((cat) => {
    const line = lineByCode[cat.code]
    const lineId = line?.id ?? null

    // ── Carnicería: resumen desde su modelo dedicado ──
    if (cat.variant === 'CARNICERIA') {
      const cortes = programaCarn?.cortes ?? []
      const completadosC = cortes.filter((c) => c.estado === 'COMPLETADO')
      const kgPlanC = cortes.reduce((a, c) => a + c.kgPTPlan, 0)
      const kgRealC = completadosC.reduce((a, c) => a + (c.kgPTReal ?? 0), 0)
      const enProcesoC = cortes.some((c) => c.estado === 'EN_PROCESO')
      let estadoC: ResumenLinea['estado'] = 'Sin programa'
      if (line?.status === 'DETENIDO') estadoC = 'Detenida'
      else if (cortes.length === 0) estadoC = 'Sin programa'
      else if (completadosC.length === cortes.length) estadoC = 'Completada'
      else if (enProcesoC) estadoC = 'En proceso'
      else estadoC = 'Pendiente'
      const ncCountC = ncs.filter((nc) => `${nc.area} ${nc.title} ${nc.description}`.toLowerCase().includes(cat.name.toLowerCase())).length
      return {
        code: cat.code, name: cat.name, lineId, variant: cat.variant, oeeEnabled: false,
        hasProgram: cortes.length > 0, kgPlan: Math.round(kgPlanC), kgReal: Math.round(kgRealC),
        cumplimientoPct: kgPlanC > 0 ? Math.round((kgRealC / kgPlanC) * 1000) / 10 : 0,
        oee: null, clasificacion: null, estado: estadoC,
        totalRegistros: cortes.length, completados: completadosC.length, ncCount: ncCountC,
      }
    }

    const regs = lineId ? regsByLine.get(lineId) ?? [] : []
    const kgPlan = regs.reduce((a, r) => a + (r.kgPlan || 0), 0)
    const kgReal = regs.reduce((a, r) => a + effectiveKgReal(r), 0)
    const completados = regs.filter((r) => r.estado === 'COMPLETADO').length
    const enProceso = regs.some((r) => r.estado === 'EN_PROCESO')
    const oeeRow = lineId ? oeeByLine[lineId] : null

    let estado: ResumenLinea['estado'] = 'Sin programa'
    if (line?.status === 'DETENIDO') estado = 'Detenida'
    else if (regs.length === 0) estado = 'Sin programa'
    else if (regs.length > 0 && completados === regs.length) estado = 'Completada'
    else if (enProceso) estado = 'En proceso'
    else estado = 'Pendiente'

    const ncCount = ncs.filter((nc) => {
      const hay = `${nc.area} ${nc.title} ${nc.description}`.toLowerCase()
      return hay.includes(cat.name.toLowerCase())
    }).length

    return {
      code: cat.code,
      name: cat.name,
      lineId,
      variant: cat.variant,
      oeeEnabled: cat.oeeEnabled,
      hasProgram: regs.length > 0,
      kgPlan: Math.round(kgPlan),
      kgReal: Math.round(kgReal),
      cumplimientoPct: kgPlan > 0 ? Math.round((kgReal / kgPlan) * 1000) / 10 : 0,
      oee: cat.oeeEnabled ? (oeeRow?.oee ?? null) : null,
      clasificacion: cat.oeeEnabled ? (oeeRow?.clasificacion ?? null) : null,
      estado,
      totalRegistros: regs.length,
      completados,
      ncCount,
    }
  })
}
