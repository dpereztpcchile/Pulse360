export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    SUPERVISOR: 'Supervisor',
    OPERADOR: 'Operador',
  }
  return labels[role] ?? role
}

export function getRoleBadgeColor(role: string) {
  const colors: Record<string, string> = {
    ADMINISTRADOR: 'bg-pulse-red/20 text-pulse-red border border-pulse-red/30',
    SUPERVISOR: 'bg-status-warn/20 text-status-warn border border-status-warn/30',
    OPERADOR: 'bg-status-ok/20 text-status-ok border border-status-ok/30',
  }
  return colors[role] ?? 'bg-gray-500/20 text-gray-400'
}

// ── Producción ──

export const LINE_STATUS = {
  OPERANDO:        { label: 'Operando',       badge: 'badge-ok',   dot: 'bg-status-ok',   bar: 'bg-status-ok',   active: true },
  EN_OBSERVACION:  { label: 'En observación', badge: 'badge-warn', dot: 'bg-status-warn', bar: 'bg-status-warn', active: false },
  DETENIDO:        { label: 'Detenido',       badge: 'badge-stop', dot: 'bg-pulse-red',   bar: 'bg-pulse-red',   active: false },
} as const

export const ORDER_STATUS = {
  PLANIFICADA: { label: 'Planificada', cls: 'bg-[#2A2A2A] text-[#999] border border-[#3A3A3A]' },
  EN_PROCESO:  { label: 'En proceso',  cls: 'bg-status-ok/10 text-status-ok border border-status-ok/20' },
  COMPLETADA:  { label: 'Completada',  cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  DETENIDA:    { label: 'Detenida',    cls: 'bg-pulse-red/10 text-pulse-red border border-pulse-red/20' },
} as const

export const SHIFT_LABELS: Record<string, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
}

/** Color del % de cumplimiento: verde >95, amarillo 80-95, rojo <80 */
export function complianceColor(pct: number) {
  if (pct > 95) return 'text-status-ok'
  if (pct >= 80) return 'text-status-warn'
  return 'text-pulse-red'
}

// ── Materias Primas ──

export const MATERIAL_CATEGORY = {
  REFRIGERADO: { label: 'Refrigerado', cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  CONGELADO:   { label: 'Congelado',   cls: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  IMPORTADO:   { label: 'Importado',   cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  EN_TRANSITO: { label: 'En Tránsito', cls: 'bg-status-warn/10 text-status-warn border border-status-warn/20' },
} as const

export type MaterialCategoryKey = keyof typeof MATERIAL_CATEGORY

export const MATERIAL_STATE = {
  OK:                { label: 'OK',              badge: 'badge-ok',   dot: 'bg-status-ok',   bar: 'bg-status-ok',   blink: false },
  PROXIMO_A_VENCER:  { label: 'Próximo a vencer', badge: 'badge-warn', dot: 'bg-status-warn', bar: 'bg-status-warn', blink: false },
  BAJO_MINIMO:       { label: 'Bajo mínimo',     badge: 'badge-stop', dot: 'bg-pulse-red',   bar: 'bg-pulse-red',   blink: true },
} as const

export type MaterialStateKey = keyof typeof MATERIAL_STATE

/** Días de antelación para marcar un insumo como "próximo a vencer". */
export const EXPIRY_WARNING_DAYS = 14

/** Días enteros desde hoy hasta la fecha dada (negativo si ya pasó). */
export function daysUntil(date: Date | string | null | undefined) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Estado del insumo. Prioridad: bajo mínimo (crítico) > próximo a vencer > OK.
 */
export function computeMaterialState(
  currentStock: number,
  minStock: number,
  nearestExpiry: Date | string | null | undefined
): MaterialStateKey {
  if (currentStock < minStock) return 'BAJO_MINIMO'
  const days = daysUntil(nearestExpiry)
  if (days !== null && days <= EXPIRY_WARNING_DAYS) return 'PROXIMO_A_VENCER'
  return 'OK'
}

// ── Despacho ──

export const DISPATCH_STATUS = {
  PREPARANDO: { label: 'Preparando', cls: 'bg-[#2A2A2A] text-[#999] border border-[#3A3A3A]', dot: 'bg-[#999]' },
  LISTO:      { label: 'Listo',      cls: 'bg-status-warn/10 text-status-warn border border-status-warn/20', dot: 'bg-status-warn' },
  DESPACHADO: { label: 'Despachado', cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', dot: 'bg-blue-400' },
  ENTREGADO:  { label: 'Entregado',  cls: 'bg-status-ok/10 text-status-ok border border-status-ok/20', dot: 'bg-status-ok' },
} as const

export type DispatchStatusKey = keyof typeof DISPATCH_STATUS

export const DISPATCH_STATUS_ORDER: DispatchStatusKey[] = ['PREPARANDO', 'LISTO', 'DESPACHADO', 'ENTREGADO']

/** Hora corta HH:MM (es-CL). */
export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

// ── No Conformidades ──

export const NC_CATEGORY = {
  CALIDAD:   { label: 'Calidad',   cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  INOCUIDAD: { label: 'Inocuidad', cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  PROCESO:   { label: 'Proceso',   cls: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  PROVEEDOR: { label: 'Proveedor', cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
} as const
export type NcCategoryKey = keyof typeof NC_CATEGORY

export const NC_SEVERITY = {
  CRITICA: { label: 'Crítica', cls: 'bg-pulse-red/10 text-pulse-red border border-pulse-red/20',     dot: 'bg-pulse-red' },
  MAYOR:   { label: 'Mayor',   cls: 'bg-status-warn/10 text-status-warn border border-status-warn/20', dot: 'bg-status-warn' },
  MENOR:   { label: 'Menor',   cls: 'bg-[#2A2A2A] text-[#999] border border-[#3A3A3A]',               dot: 'bg-[#999]' },
} as const
export type NcSeverityKey = keyof typeof NC_SEVERITY

export const NC_STATUS = {
  ABIERTA:           { label: 'Abierta',            cls: 'bg-pulse-red/10 text-pulse-red border border-pulse-red/20' },
  EN_INVESTIGACION:  { label: 'En investigación',   cls: 'bg-status-warn/10 text-status-warn border border-status-warn/20' },
  ACCION_CORRECTIVA: { label: 'Acción correctiva',  cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  CERRADA:           { label: 'Cerrada',            cls: 'bg-status-ok/10 text-status-ok border border-status-ok/20' },
} as const
export type NcStatusKey = keyof typeof NC_STATUS

export const NC_STATUS_ORDER: NcStatusKey[] = ['ABIERTA', 'EN_INVESTIGACION', 'ACCION_CORRECTIVA', 'CERRADA']

/** Una NC está vencida si pasó la fecha límite y no está cerrada. */
export function ncIsOverdue(dueDate: Date | string, status: string) {
  if (status === 'CERRADA') return false
  return new Date(dueDate).getTime() < Date.now()
}

// ── Capacidad vs Demanda ──

/** Días productivos por semana usados en el cálculo de capacidad. */
export const CAPACITY_DAYS_PER_WEEK = 7

/** Capacidad instalada semanal (kg/semana) a partir de la configuración de la línea. */
export function weeklyCapacityKg(
  kgPerHour: number,
  hoursPerShift: number,
  activeShifts: number,
  efficiency: number,
) {
  return kgPerHour * hoursPerShift * activeShifts * (efficiency / 100) * CAPACITY_DAYS_PER_WEEK
}

export type OccupationStateKey = 'OK' | 'ALTA' | 'CRITICA'

/** Estado de ocupación según %: <80 verde, 80-90 amarillo, >90 rojo. */
export function occupationState(pct: number): {
  key: OccupationStateKey
  label: string
  text: string
  badge: string
  bar: string
  dot: string
} {
  if (pct > 90) {
    return {
      key: 'CRITICA', label: 'Sobrecargada',
      text: 'text-pulse-red',
      badge: 'bg-pulse-red/10 text-pulse-red border border-pulse-red/20',
      bar: 'bg-pulse-red', dot: 'bg-pulse-red',
    }
  }
  if (pct >= 80) {
    return {
      key: 'ALTA', label: 'Al límite',
      text: 'text-status-warn',
      badge: 'bg-status-warn/10 text-status-warn border border-status-warn/20',
      bar: 'bg-status-warn', dot: 'bg-status-warn',
    }
  }
  return {
    key: 'OK', label: 'Holgura',
    text: 'text-status-ok',
    badge: 'bg-status-ok/10 text-status-ok border border-status-ok/20',
    bar: 'bg-status-ok', dot: 'bg-status-ok',
  }
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Número de semanas (columnas) de un mes dado: ceil(días/7). month 1-12. */
export function weeksInMonth(year: number, month: number) {
  const days = new Date(year, month, 0).getDate()
  return Math.ceil(days / 7)
}

/** Semana del mes (1-5) para una fecha dada. */
export function weekOfMonth(date: Date = new Date()) {
  return Math.ceil(date.getDate() / 7)
}

// ── Alertas ──────────────────────────────────────────────

export const ALERT_MODULE = {
  PRODUCCION:       { label: 'Producción',       cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  MATERIAS_PRIMAS:  { label: 'Materias Primas',  cls: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  DESPACHO:         { label: 'Despacho',         cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  NO_CONFORMIDADES: { label: 'No Conformidades', cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  CAPACIDAD:        { label: 'Capacidad',        cls: 'bg-teal-500/10 text-teal-400 border border-teal-500/20' },
} as const
export type AlertModuleKey = keyof typeof ALERT_MODULE

export const ALERT_SEVERITY = {
  CRITICA:     { label: 'Crítica',     order: 0, text: 'text-white',          counterBg: 'bg-pulse-red',     counterText: 'text-white', badge: 'bg-pulse-red text-white',                              dot: 'bg-pulse-red' },
  ADVERTENCIA: { label: 'Advertencia', order: 1, text: 'text-status-warn',    counterBg: 'bg-status-warn',   counterText: 'text-black', badge: 'bg-status-warn/15 text-status-warn border border-status-warn/30', dot: 'bg-status-warn' },
  INFORMATIVA: { label: 'Informativa', order: 2, text: 'text-[#999]',         counterBg: 'bg-card-dark',     counterText: 'text-[#999]', badge: 'bg-border-dark text-[#999] border border-[#333]',             dot: 'bg-[#777]' },
} as const
export type AlertSeverityKey = keyof typeof ALERT_SEVERITY

export const ALERT_STATUS = {
  ACTIVA:     { label: 'Activa',      cls: 'bg-pulse-red/10 text-pulse-red border border-pulse-red/20' },
  RECONOCIDA: { label: 'Reconocida',  cls: 'bg-status-warn/10 text-status-warn border border-status-warn/20' },
  RESUELTA:   { label: 'Resuelta',    cls: 'bg-status-ok/10 text-status-ok border border-status-ok/20' },
} as const
export type AlertStatusKey = keyof typeof ALERT_STATUS

/**
 * Rango de temperatura aceptable (°C) según categoría de insumo.
 * Devuelve null si la categoría no requiere control de temperatura.
 */
export function tempRangeFor(category: string): { min: number; max: number } | null {
  switch (category) {
    case 'REFRIGERADO': return { min: 0, max: 5 }
    case 'CONGELADO':   return { min: -25, max: -18 }
    default:            return null
  }
}

/** Formatea una duración en milisegundos como "Xh Ym", "Xm" o "Xs". */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return `${Math.round(ms / 1000)}s`
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
