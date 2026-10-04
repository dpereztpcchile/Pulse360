// PULSE 360 — No Conformidades: agregaciones para la pestaña "Indicadores".
// Dos grupos de análisis según la columna RESPONSABLE del Excel:
//   - Proveedor: defecto causado por el proveedor (OC, recepción de MP, etc.)
//   - Planta: defecto causado por la operación interna de la planta.
// Regla transversal: las NC "gestionadas" (coordinación con el proveedor para
// devolución del dinero) se excluyen SIEMPRE de los indicadores, en ambos
// grupos — se mantienen solo en el listado histórico.
import { prisma } from '@/lib/prisma'
import { ncEsInsumoEnvase } from './constants'
import type { NcRegistro } from '@prisma/client'

export interface IndicadoresFiltros {
  semanaDesde?: number
  semanaHasta?: number
  /** Si es true, excluye productos de envase/embalaje (filtro configurable, no por defecto). */
  excluirEnvase?: boolean
}

async function fetchRegistros(responsable: 'PROVEEDOR' | 'PLANTA', filtros: IndicadoresFiltros): Promise<NcRegistro[]> {
  const where: Record<string, unknown> = { responsable, gestionado: false }
  if (filtros.semanaDesde != null || filtros.semanaHasta != null) {
    where.semana = {
      ...(filtros.semanaDesde != null ? { gte: filtros.semanaDesde } : {}),
      ...(filtros.semanaHasta != null ? { lte: filtros.semanaHasta } : {}),
    }
  }
  const rows = await prisma.ncRegistro.findMany({ where, orderBy: { semana: 'asc' } })
  if (filtros.excluirEnvase) {
    return rows.filter((r) => !ncEsInsumoEnvase(r.producto))
  }
  return rows
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const round = (n: number) => Math.round(n * 100) / 100

// ═══════════════════════════════════════════════════════════
// Grupo PROVEEDOR
// ═══════════════════════════════════════════════════════════
export interface IndicadoresProveedor {
  totalNc: number
  totalValorNcOC: number
  montoRecaudadoVentaTercero: number
  porProveedorRazon: { proveedor: string; razon: string; valorNcOC: number; cantidad: number }[]
  porProveedor: { proveedor: string; valorNcOC: number; cantidad: number }[]
  porRazon: { razon: string; valorNcOC: number; cantidad: number }[]
  porSemana: { semana: number; valorNcOC: number; cantidad: number }[]
}

export async function getIndicadoresProveedor(filtros: IndicadoresFiltros = {}): Promise<IndicadoresProveedor> {
  const rows = await fetchRegistros('PROVEEDOR', filtros)

  const totalNc = rows.length
  const totalValorNcOC = round(sum(rows.map((r) => r.valorNcOC ?? 0)))
  // "Monto recaudado por V.T.": suma de VALOR VENTA NC para las NC vendidas a terceros.
  const montoRecaudadoVentaTercero = round(
    sum(rows.filter((r) => r.destino === 'VENTA_A_TERCEROS').map((r) => r.valorVentaNc ?? 0)),
  )

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
    .map((v) => ({ ...v, valorNcOC: round(v.valorNcOC) }))
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

  return { totalNc, totalValorNcOC, montoRecaudadoVentaTercero, porProveedorRazon, porProveedor, porRazon, porSemana }
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

  return { totalNc, totalValorNcOC, totalValorVentaNc, porSemanaRazon, porRazon, porSemana }
}
