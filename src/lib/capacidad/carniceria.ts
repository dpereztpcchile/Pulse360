// PULSE 360 — Capacidad Carnicería: cálculo de capacidad por turnos.
import type { CapacidadEstado } from '@prisma/client'

export const CARNICERIA_CODE = 'CARNICERIA'
export const PRODUCTIVIDAD_NOMINAL = 100 // Kg MP/HH

export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Índice 0=Lun .. 6=Dom a partir de un Date. */
export function dayIndex(date: Date): number {
  const js = date.getDay() // 0=Dom..6=Sáb
  return js === 0 ? 6 : js - 1
}

export function estadoFromOcupacion(pct: number): CapacidadEstado {
  if (pct >= 100) return 'ESTRES'
  if (pct >= 90) return 'ALERTA'
  return 'HOLGURA'
}

export const ESTADO_META: Record<CapacidadEstado, { label: string; color: string; bg: string; border: string }> = {
  HOLGURA: { label: 'Holgura', color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: '#22C55E' },
  ALERTA:  { label: 'Alerta',  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: '#F59E0B' },
  ESTRES:  { label: 'Estrés',  color: '#CC0000', bg: 'rgba(204,0,0,0.10)',   border: '#CC0000' },
}

export interface TurnoConfigLite {
  turnoNombre: string
  cantPersonas: number
  hhPorDia: number[] // Lun..Sáb
  activo: boolean
}

export interface CapacityBreakdown {
  hhDisponibles: number
  capacidadKgMP: number
  porTurno: { turnoNombre: string; hh: number; personas: number }[]
}

/** Capacidad de un día (a partir de la config de turnos). Domingo = 0. */
export function capacityForDate(configs: TurnoConfigLite[], date: Date): CapacityBreakdown {
  const idx = dayIndex(date)
  if (idx === 6) return { hhDisponibles: 0, capacidadKgMP: 0, porTurno: [] }
  const porTurno = configs
    .filter((c) => c.activo)
    .map((c) => {
      const hhPersona = c.hhPorDia[idx] ?? 0
      const hh = hhPersona * c.cantPersonas
      return { turnoNombre: c.turnoNombre, hh, personas: c.cantPersonas }
    })
    .filter((t) => t.hh > 0)
  const hhDisponibles = porTurno.reduce((a, t) => a + t.hh, 0)
  return {
    hhDisponibles: Math.round(hhDisponibles * 10) / 10,
    capacidadKgMP: Math.round(hhDisponibles * PRODUCTIVIDAD_NOMINAL),
    porTurno,
  }
}
