// PULSE 360 — Control de Turno
// Catálogo de líneas, variantes, capacidades nominales y constantes del módulo.
// Estos valores definen el comportamiento de cada línea en la pestaña Control de Turno.

export type LineVariant = 'CARNICERIA' | 'ENVASADO' | 'MOLIENDA'

export interface TurnoLine {
  /** Código único de la línea (coincide con ProductionLine.code) */
  code: string
  /** Nombre visible */
  name: string
  /** Variante de registro: A (Carnicería), B (Envasado), C (Molienda) */
  variant: LineVariant
  /** Si la línea calcula OEE */
  oeeEnabled: boolean
  /**
   * Capacidad nominal en kg/hr. Para Carnicería es kg/HH por carnicero (100),
   * que luego se multiplica por la dotación del turno.
   */
  nominalKgHr: number
  /** Minutos teóricos del turno (8h = 480 min por defecto) */
  shiftMinutes: number
}

/** Minutos por turno por defecto (8 horas). */
export const DEFAULT_SHIFT_MINUTES = 480

/** Objetivo de duración por batch de molienda (minutos). */
export const BATCH_OBJETIVO_MIN = 25

/** Catálogo de las 8 líneas del Control de Turno. */
export const LINE_CATALOG: TurnoLine[] = [
  // Carnicería mide productividad sobre MP bruta (Kg MP/HH), no OEE → oeeEnabled: false
  { code: 'CARNICERIA', name: 'Carnicería',      variant: 'CARNICERIA', oeeEnabled: false, nominalKgHr: 100,  shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'L4',         name: 'Línea 4',         variant: 'ENVASADO',   oeeEnabled: true,  nominalKgHr: 800,  shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'L5',         name: 'Línea 5',         variant: 'ENVASADO',   oeeEnabled: true,  nominalKgHr: 500,  shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'SKIN',       name: 'Skin Pack',       variant: 'ENVASADO',   oeeEnabled: false, nominalKgHr: 0,    shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'MILANESAS',  name: 'Milanesas',       variant: 'ENVASADO',   oeeEnabled: false, nominalKgHr: 0,    shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'MOLIENDA',   name: 'Molienda',        variant: 'MOLIENDA',   oeeEnabled: true,  nominalKgHr: 2700, shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'LM1',        name: 'Línea Molida 1',  variant: 'ENVASADO',   oeeEnabled: true,  nominalKgHr: 3000, shiftMinutes: DEFAULT_SHIFT_MINUTES },
  { code: 'LM2',        name: 'Línea Molida 2',  variant: 'ENVASADO',   oeeEnabled: true,  nominalKgHr: 3000, shiftMinutes: DEFAULT_SHIFT_MINUTES },
]

export const LINE_BY_CODE: Record<string, TurnoLine> = Object.fromEntries(
  LINE_CATALOG.map((l) => [l.code, l]),
)

export function getTurnoLine(code: string): TurnoLine | undefined {
  return LINE_BY_CODE[code]
}

/** Hojas del Excel del programa diario y a qué línea(s) alimentan. */
export const SHEET_BISTEC = 'BISTEC-TROZOS'
export const SHEET_MOLIDA = 'MOLIDA'

/** Motivos de parada disponibles en el cierre de turno. */
export const STOP_REASONS = [
  'Limpieza CIP',
  'Cambio de formato',
  'Falla mecánica',
  'Espera de materia prima',
  'Falta de personal',
  'Reunión/capacitación',
  'Ajuste de máquina',
  'Otro',
] as const

export type StopReason = (typeof STOP_REASONS)[number]

// ─── Clasificación OEE ───────────────────────────────────
export interface OeeClass {
  label: string
  color: string // hex
  /** Clave estable para persistir en BD */
  key: 'CLASE_MUNDIAL' | 'BUENO' | 'PROMEDIO' | 'BAJO'
}

export function classifyOee(oee: number): OeeClass {
  if (oee >= 85) return { key: 'CLASE_MUNDIAL', label: 'Clase mundial', color: '#22C55E' }
  if (oee >= 65) return { key: 'BUENO', label: 'Bueno', color: '#F59E0B' }
  if (oee >= 45) return { key: 'PROMEDIO', label: 'Promedio', color: '#F97316' }
  return { key: 'BAJO', label: 'Bajo', color: '#CC0000' }
}

/**
 * Deriva el peso unitario (kg) a partir del nombre/formato del producto.
 * Ej: "Carne Molida Especial 500g" → 0.5 ; "Bistec de Paleta 1kg" → 1.
 * Devuelve null si no se puede inferir.
 */
export function pesoUnitarioFromFormato(nombre: string): number | null {
  if (!nombre) return null
  const m = nombre.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i)
  if (!m) return null
  const val = parseFloat(m[1].replace(',', '.'))
  if (Number.isNaN(val)) return null
  return m[2].toLowerCase() === 'kg' ? val : val / 1000
}
