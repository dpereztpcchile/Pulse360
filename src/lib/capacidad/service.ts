// PULSE 360 — Capacidad Carnicería: lógica de servidor (páginas + APIs).
import { prisma } from '@/lib/prisma'
import { dayBounds } from '@/lib/control-turno/service'
import {
  CARNICERIA_CODE, DAY_LABELS, dayIndex,
  estadoFromOcupacion, capacityForDate, type TurnoConfigLite, type CapacityBreakdown,
} from './carniceria'
import type { CapacidadEstado } from '@prisma/client'

export async function getCarniceriaLine() {
  return prisma.productionLine.findUnique({ where: { code: CARNICERIA_CODE }, select: { id: true, name: true, code: true } })
}

export async function getConfigTurnos() {
  const line = await getCarniceriaLine()
  if (!line) return { line: null, configs: [] }
  const configs = await prisma.configuracionTurnos.findMany({ where: { lineaId: line.id }, orderBy: { orden: 'asc' } })
  return { line, configs }
}

export interface DiaView {
  fecha: string
  diaLabel: string
  esDomingo: boolean
  capacidadKgMP: number
  hhDisponibles: number
  pedidoKgMP: number
  ocupacionPorc: number
  holguraKgMP: number
  estado: CapacidadEstado
  prodRealKgHH: number | null
  hasProgram: boolean
  breakdown: CapacityBreakdown['porTurno']
}

export async function getDiaView(fechaStr?: string | null): Promise<DiaView | null> {
  const line = await getCarniceriaLine()
  if (!line) return null
  const { start, end, day } = dayBounds(fechaStr)

  const configsRaw = await prisma.configuracionTurnos.findMany({ where: { lineaId: line.id }, orderBy: { orden: 'asc' } })
  const configs: TurnoConfigLite[] = configsRaw.map((c) => ({ turnoNombre: c.turnoNombre, cantPersonas: c.cantPersonas, hhPorDia: c.hhPorDia, activo: c.activo }))
  const cap = capacityForDate(configs, day)

  // Pedido del día: suma de kgMPTeorico de todos los programas de Carnicería de la fecha
  const programas = await prisma.programaCarniceria.findMany({
    where: { fecha: { gte: start, lte: end } },
    include: { cortes: true },
  })
  const cortes = programas.flatMap((p) => p.cortes)
  const pedido = cortes.reduce((a, c) => a + c.kgMPTeorico, 0)

  // Productividad real: promedio ponderado por HH de los cortes completados
  const completados = cortes.filter((c) => c.estado === 'COMPLETADO' && c.prodReal != null && c.hhReales != null)
  const sumHH = completados.reduce((a, c) => a + (c.hhReales ?? 0), 0)
  const prodReal = sumHH > 0
    ? Math.round((completados.reduce((a, c) => a + (c.prodReal ?? 0) * (c.hhReales ?? 0), 0) / sumHH) * 10) / 10
    : null

  const ocupacion = cap.capacidadKgMP > 0 ? Math.round((pedido / cap.capacidadKgMP) * 1000) / 10 : 0
  const holgura = Math.round(cap.capacidadKgMP - pedido)
  const estado = estadoFromOcupacion(ocupacion)
  const idx = dayIndex(day)
  const esDomingo = idx === 6

  // Persistir snapshot (solo días laborales con capacidad)
  if (cap.capacidadKgMP > 0) {
    await prisma.capacidadDiaria.upsert({
      where: { lineaId_fecha: { lineaId: line.id, fecha: day } },
      create: {
        lineaId: line.id, fecha: day, diaSemana: idx + 1, hhDisponibles: cap.hhDisponibles,
        capacidadKgMP: cap.capacidadKgMP, pedidoKgMP: Math.round(pedido), ocupacionPorc: ocupacion,
        holguraKgMP: holgura, estado, prodRealKgHH: prodReal,
      },
      update: {
        hhDisponibles: cap.hhDisponibles, capacidadKgMP: cap.capacidadKgMP, pedidoKgMP: Math.round(pedido),
        ocupacionPorc: ocupacion, holguraKgMP: holgura, estado, prodRealKgHH: prodReal,
      },
    })
  }

  return {
    fecha: day.toISOString().slice(0, 10),
    diaLabel: DAY_LABELS[idx],
    esDomingo,
    capacidadKgMP: cap.capacidadKgMP,
    hhDisponibles: cap.hhDisponibles,
    pedidoKgMP: Math.round(pedido),
    ocupacionPorc: ocupacion,
    holguraKgMP: holgura,
    estado,
    prodRealKgHH: prodReal,
    hasProgram: programas.length > 0,
    breakdown: cap.porTurno,
  }
}

export interface HistoricoRow {
  fecha: string
  diaSemana: number
  capacidadKgMP: number
  pedidoKgMP: number
  ocupacionPorc: number
  holguraKgMP: number
  prodRealKgHH: number | null
  estado: CapacidadEstado
}

export interface HistoricoResult {
  kpis: { ocupacionProm: number; diasEstres: number; diasAlerta: number; prodRealProm: number | null }
  rows: HistoricoRow[]
}

const PERIODO_DAYS: Record<string, number> = { '2sem': 14, mes: 30, '3meses': 90 }

export async function getHistorico(periodo = '2sem', estadoFilter = 'todos'): Promise<HistoricoResult> {
  const line = await getCarniceriaLine()
  if (!line) return { kpis: { ocupacionProm: 0, diasEstres: 0, diasAlerta: 0, prodRealProm: null }, rows: [] }

  const days = PERIODO_DAYS[periodo] ?? 14
  const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - days)

  const where: { lineaId: string; fecha: { gte: Date }; estado?: CapacidadEstado } = { lineaId: line.id, fecha: { gte: from } }
  if (estadoFilter === 'estres') where.estado = 'ESTRES'
  else if (estadoFilter === 'advertencia') where.estado = 'ALERTA'

  const rowsRaw = await prisma.capacidadDiaria.findMany({ where, orderBy: { fecha: 'asc' } })

  const ocupProm = rowsRaw.length > 0 ? Math.round((rowsRaw.reduce((a, r) => a + r.ocupacionPorc, 0) / rowsRaw.length) * 10) / 10 : 0
  const diasEstres = rowsRaw.filter((r) => r.estado === 'ESTRES').length
  const diasAlerta = rowsRaw.filter((r) => r.estado === 'ALERTA').length
  const conProd = rowsRaw.filter((r) => r.prodRealKgHH != null)
  const prodProm = conProd.length > 0 ? Math.round((conProd.reduce((a, r) => a + (r.prodRealKgHH ?? 0), 0) / conProd.length) * 10) / 10 : null

  return {
    kpis: { ocupacionProm: ocupProm, diasEstres, diasAlerta, prodRealProm: prodProm },
    rows: rowsRaw.map((r) => ({
      fecha: r.fecha.toISOString().slice(0, 10),
      diaSemana: r.diaSemana,
      capacidadKgMP: r.capacidadKgMP,
      pedidoKgMP: r.pedidoKgMP,
      ocupacionPorc: r.ocupacionPorc,
      holguraKgMP: r.holguraKgMP,
      prodRealKgHH: r.prodRealKgHH,
      estado: r.estado,
    })),
  }
}
