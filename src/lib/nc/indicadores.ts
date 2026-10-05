// PULSE 360 — No Conformidades: agregaciones para la pestaña "Indicadores".
// Dos grupos de análisis según la columna RESPONSABLE del Excel:
//   - Proveedor: defecto causado por el proveedor (OC, recepción de MP, etc.)
//   - Planta: defecto causado por la operación interna de la planta.
// Regla transversal: las NC "gestionadas" (coordinación con el proveedor para
// devolución del dinero) se excluyen SIEMPRE de los indicadores económicos,
// en ambos grupos — se mantienen solo en el listado histórico. La única
// excepción es el propio indicador "Gestionado" (donut), que existe
// justamente para mostrar qué proporción de las NC fue gestionada.
import { prisma } from '@/lib/prisma'
import { ncEsInsumoEnvase } from './constants'
import type { NcRegistro } from '@prisma/client'

export interface IndicadoresFiltros {
  semanaDesde?: number
  semanaHasta?: number
  /** Semanas específicas seleccionadas en el segmentador (multi-selección). Si viene vacío/undefined, no filtra. */
  semanas?: number[]
  /** Meses específicos (formato 'YYYY-MM', según la columna FECHA) seleccionados en el segmentador. */
  meses?: string[]
  /** Si es true, excluye productos de envase/embalaje (no son producto cárnico). */
  excluirEnvase?: boolean
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

function buildWhere(responsable: 'PROVEEDOR' | 'PLANTA', filtros: IndicadoresFiltros, incluirGestionadas = false) {
  const where: Record<string, unknown> = { responsable }
  if (!incluirGestionadas) where.gestionado = false
  if (filtros.semanas && filtros.semanas.length > 0) {
    where.semana = { in: filtros.semanas }
  } else if (filtros.semanaDesde != null || filtros.semanaHasta != null) {
    where.semana = {
      ...(filtros.semanaDesde != null ? { gte: filtros.semanaDesde } : {}),
      ...(filtros.semanaHasta != null ? { lte: filtros.semanaHasta } : {}),
    }
  }
  return where
}

async function fetchRegistros(
  responsable: 'PROVEEDOR' | 'PLANTA',
  filtros: IndicadoresFiltros,
  incluirGestionadas = false,
): Promise<NcRegistro[]> {
  const where = buildWhere(responsable, filtros, incluirGestionadas)
  let rows = await prisma.ncRegistro.findMany({ where, orderBy: { semana: 'asc' } })
  if (filtros.meses && filtros.meses.length > 0) {
    const set = new Set(filtros.meses)
    rows = rows.filter((r) => set.has(monthKey(r.fecha)))
  }
  if (filtros.excluirEnvase) {
    rows = rows.filter((r) => !ncEsInsumoEnvase(r.producto))
  }
  return rows
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const round = (n: number) => Math.round(n * 100) / 100
// Redondea a 1 decimal (ej. 35,9%). Nota: NO usar round() aquí — round() ya
// redondea a 2 decimales, y encadenarlo con /10 deja 3 decimales en el resultado.
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0)

export interface GestionadoStats {
  si: number
  no: number
  siPct: number
  noPct: number
}

async function computeGestionadoStats(responsable: 'PROVEEDOR' | 'PLANTA', filtros: IndicadoresFiltros): Promise<GestionadoStats> {
  const rows = await fetchRegistros(responsable, filtros, true)
  const si = rows.filter((r) => r.gestionado).length
  const no = rows.length - si
  const total = rows.length
  return { si, no, siPct: pct(si, total), noPct: pct(no, total) }
}

/** Semanas y meses disponibles para el segmentador, calculados sobre el histórico
 *  completo del grupo (sin aplicar los filtros de período actuales), para que el
 *  panel de filtros siempre muestre todas las opciones posibles. */
async function fetchOpcionesSegmentador(responsable: 'PROVEEDOR' | 'PLANTA', excluirEnvase?: boolean) {
  const rows = await prisma.ncRegistro.findMany({
    where: { responsable, gestionado: false },
    select: { semana: true, fecha: true, producto: true },
  })
  const filtered = excluirEnvase ? rows.filter((r) => !ncEsInsumoEnvase(r.producto)) : rows
  const semanas = Array.from(new Set(filtered.map((r) => r.semana))).sort((a, b) => a - b)
  const meses = Array.from(new Set(filtered.map((r) => monthKey(r.fecha)))).sort()
  return { semanasDisponibles: semanas, mesesDisponibles: meses }
}

// ═══════════════════════════════════════════════════════════
// Grupo PROVEEDOR
// ═══════════════════════════════════════════════════════════
export interface IndicadoresProveedor {
  totalNc: number
  totalValorNcOC: number
  montoRecaudadoVentaTercero: number
  /** Pérdida neta del período: valor generado por NC menos lo recaudado por venta a terceros. */
  impacto: number
  /** % del valor generado por NC que se logró recuperar vía venta a terceros. */
  retornoPct: number
  gestionado: GestionadoStats
  porProveedorRazon: { proveedor: string; razon: string; valorNcOC: number; cantidad: number }[]
  porProveedor: { proveedor: string; valorNcOC: number; cantidad: number; participacionPct: number }[]
  porRazon: { razon: string; valorNcOC: number; cantidad: number }[]
  porSemana: { semana: number; valorNcOC: number; cantidad: number }[]
  /** Productos (cárnicos) que más generan NC, desagregado por razón — para el gráfico de barras apiladas. */
  porProductoRazon: { producto: string; razon: string; cantidad: number; valorNcOC: number }[]
  semanasDisponibles: number[]
  mesesDisponibles: string[]
}

export async function getIndicadoresProveedor(filtros: IndicadoresFiltros = {}): Promise<IndicadoresProveedor> {
  const rows = await fetchRegistros('PROVEEDOR', filtros)

  const totalNc = rows.length
  const totalValorNcOC = round(sum(rows.map((r) => r.valorNcOC ?? 0)))
  // "Monto recaudado por V.T.": suma de VALOR VENTA NC para las NC vendidas a terceros.
  const montoRecaudadoVentaTercero = round(
    sum(rows.filter((r) => r.destino === 'VENTA_A_TERCEROS').map((r) => r.valorVentaNc ?? 0)),
  )
  const impacto = round(totalValorNcOC - montoRecaudadoVentaTercero)
  const retornoPct = pct(montoRecaudadoVentaTercero, totalValorNcOC)

  const gestionado = await computeGestionadoStats('PROVEEDOR', filtros)

  const keyPR = (r: NcRegistro) => `${r.proveedor ?? 'Sin proveedor'}|||${r.razon}`
  const mapPR = new Map<string, { proveedor: string; razon: string; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const k = keyPR(r)
    const cur = mapPR.get(k) ?? { proveedor: r.proveedor ?? 'Sin proveedor', razon: r.razon, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapPR.set(k, cur)
  }
  const porProveedorRazon = Array.from(mapPR.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => b.valorNcOC - a.valorNcOC)

  const mapProv = new Map<string, { proveedor: string; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const k = r.proveedor ?? 'Sin proveedor'
    const cur = mapProv.get(k) ?? { proveedor: k, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapProv.set(k, cur)
  }
  const porProveedor = Array.from(mapProv.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC), participacionPct: pct(v.valorNcOC, totalValorNcOC) }))
    .sort((a, b) => b.valorNcOC - a.valorNcOC)

  const mapRazon = new Map<string, { razon: string; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const cur = mapRazon.get(r.razon) ?? { razon: r.razon, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapRazon.set(r.razon, cur)
  }
  const porRazon = Array.from(mapRazon.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => b.valorNcOC - a.valorNcOC)

  const mapSemana = new Map<number, { semana: number; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const cur = mapSemana.get(r.semana) ?? { semana: r.semana, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapSemana.set(r.semana, cur)
  }
  const porSemana = Array.from(mapSemana.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => a.semana - b.semana)

  const keyProdR = (r: NcRegistro) => `${r.producto}|||${r.razon}`
  const mapProdR = new Map<string, { producto: string; razon: string; cantidad: number; valorNcOC: number }>()
  for (const r of rows) {
    const k = keyProdR(r)
    const cur = mapProdR.get(k) ?? { producto: r.producto, razon: r.razon, cantidad: 0, valorNcOC: 0 }
    cur.cantidad += 1
    cur.valorNcOC += r.valorNcOC ?? 0
    mapProdR.set(k, cur)
  }
  const porProductoRazon = Array.from(mapProdR.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => b.cantidad - a.cantidad)

  const { semanasDisponibles, mesesDisponibles } = await fetchOpcionesSegmentador('PROVEEDOR', filtros.excluirEnvase)

  return {
    totalNc, totalValorNcOC, montoRecaudadoVentaTercero, impacto, retornoPct, gestionado,
    porProveedorRazon, porProveedor, porRazon, porSemana, porProductoRazon,
    semanasDisponibles, mesesDisponibles,
  }
}

// ═══════════════════════════════════════════════════════════
// Grupo PLANTA
// ═══════════════════════════════════════════════════════════
export interface IndicadoresPlanta {
  totalNc: number
  totalValorNcOC: number
  totalValorVentaNc: number
  porSemanaRazon: { semana: number; razon: string; valorNcOC: number; cantidad: number }[]
  porRazon: { razon: string; valorNcOC: number; cantidad: number }[]
  porSemana: { semana: number; valorNcOC: number; cantidad: number }[]
  semanasDisponibles: number[]
  mesesDisponibles: string[]
}

export async function getIndicadoresPlanta(filtros: IndicadoresFiltros = {}): Promise<IndicadoresPlanta> {
  const rows = await fetchRegistros('PLANTA', filtros)

  const totalNc = rows.length
  const totalValorNcOC = round(sum(rows.map((r) => r.valorNcOC ?? 0)))
  const totalValorVentaNc = round(sum(rows.map((r) => r.valorVentaNc ?? 0)))

  const keySR = (r: NcRegistro) => `${r.semana}|||${r.razon}`
  const mapSR = new Map<string, { semana: number; razon: string; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const k = keySR(r)
    const cur = mapSR.get(k) ?? { semana: r.semana, razon: r.razon, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapSR.set(k, cur)
  }
  const porSemanaRazon = Array.from(mapSR.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => a.semana - b.semana || b.valorNcOC - a.valorNcOC)

  const mapRazon = new Map<string, { razon: string; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const cur = mapRazon.get(r.razon) ?? { razon: r.razon, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapRazon.set(r.razon, cur)
  }
  const porRazon = Array.from(mapRazon.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => b.valorNcOC - a.valorNcOC)

  const mapSemana = new Map<number, { semana: number; valorNcOC: number; cantidad: number }>()
  for (const r of rows) {
    const cur = mapSemana.get(r.semana) ?? { semana: r.semana, valorNcOC: 0, cantidad: 0 }
    cur.valorNcOC += r.valorNcOC ?? 0
    cur.cantidad += 1
    mapSemana.set(r.semana, cur)
  }
  const porSemana = Array.from(mapSemana.values())
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
    .sort((a, b) => a.semana - b.semana)

  const { semanasDisponibles, mesesDisponibles } = await fetchOpcionesSegmentador('PLANTA', filtros.excluirEnvase)

  return {
    totalNc, totalValorNcOC, totalValorVentaNc, porSemanaRazon, porRazon, porSemana,
    semanasDisponibles, mesesDisponibles,
  }
}
