// PULSE 360 — Cálculo de OEE por línea y turno.
// Fórmulas (ver especificación del módulo Control de Turno):
//   Disponibilidad = (480 min − Total min paradas) / 480 min × 100
//   Rendimiento    = Kg reales / (Capacidad nominal × Tiempo disponible hrs) × 100
//   Calidad        = % rendimiento real / % rendimiento teórico × 100
//   OEE            = Disponibilidad × Rendimiento × Calidad / 10.000
import { classifyOee, DEFAULT_SHIFT_MINUTES, type OeeClass } from './config'

export interface OeeInput {
  /** Kg reales producidos en el turno */
  kgReal: number
  /** Kg planificados del turno (para clasificar cumplimiento / fallback de calidad) */
  kgPlan: number
  /**
   * Capacidad nominal en kg/hr. Para Carnicería ya debe venir resuelta como
   * 100 Kg/HH × dotación del turno.
   */
  capacidadNominal: number
  /** Minutos del turno (480 por defecto) */
  shiftMinutes?: number
  /** Total de minutos de paradas registradas */
  totalParadasMin: number
  /** % de rendimiento real de la línea (kg salida / kg MP × 100). Si no se conoce, fallback a kgReal/kgPlan. */
  rendRealPct?: number | null
  /** % de rendimiento teórico de la línea (del programa). Si no se conoce, 100. */
  rendTeoricoPct?: number | null
}

export interface OeeResult {
  disponibilidad: number
  rendimiento: number
  calidad: number
  oee: number
  clasificacion: OeeClass
  // Datos para la tabla comparativa
  capacidadNominal: number
  tiempoDisponibleHrs: number
  produccionTeoricaMax: number
  produccionReal: number
  brecha: number
  totalParadasMin: number
  shiftMinutes: number
}

const round1 = (n: number) => Math.round(n * 10) / 10
const clampPct = (n: number) => Math.max(0, Math.min(100, n))

export function computeOee(input: OeeInput): OeeResult {
  const shiftMinutes = input.shiftMinutes ?? DEFAULT_SHIFT_MINUTES
  const paradas = Math.max(0, Math.min(shiftMinutes, input.totalParadasMin || 0))
  const tiempoDisponibleMin = shiftMinutes - paradas
  const tiempoDisponibleHrs = tiempoDisponibleMin / 60

  // Disponibilidad
  const disponibilidad = shiftMinutes > 0 ? (tiempoDisponibleMin / shiftMinutes) * 100 : 0

  // Rendimiento (performance)
  const produccionTeoricaMax = input.capacidadNominal * tiempoDisponibleHrs
  const rendimiento = produccionTeoricaMax > 0 ? (input.kgReal / produccionTeoricaMax) * 100 : 0

  // Calidad
  const rendReal = input.rendRealPct != null
    ? input.rendRealPct
    : input.kgPlan > 0 ? (input.kgReal / input.kgPlan) * 100 : 0
  const rendTeorico = input.rendTeoricoPct && input.rendTeoricoPct > 0 ? input.rendTeoricoPct : 100
  const calidad = rendTeorico > 0 ? (rendReal / rendTeorico) * 100 : 0

  // Componentes acotados a [0,100] para el cálculo de OEE
  const dispC = clampPct(disponibilidad)
  const rendC = clampPct(rendimiento)
  const calC = clampPct(calidad)
  const oee = (dispC * rendC * calC) / 10000

  return {
    disponibilidad: round1(dispC),
    rendimiento: round1(rendC),
    calidad: round1(calC),
    oee: round1(oee),
    clasificacion: classifyOee(oee),
    capacidadNominal: round1(input.capacidadNominal),
    tiempoDisponibleHrs: round1(tiempoDisponibleHrs),
    produccionTeoricaMax: Math.round(produccionTeoricaMax),
    produccionReal: Math.round(input.kgReal),
    brecha: Math.round(input.kgReal - produccionTeoricaMax),
    totalParadasMin: paradas,
    shiftMinutes,
  }
}
