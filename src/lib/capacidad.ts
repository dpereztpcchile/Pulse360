// PULSE 360 — Servicio central de CAPACIDAD (única fuente de verdad).
// Lee horarios y productividad desde la BD (modelos Linea/Turno/HorarioDia/ConfigProductividad).
import { prisma } from '@/lib/prisma'

export interface HorarioDiaDTO { dia: number; opera: boolean; ingreso: string | null; salida: string | null; colacion: number; HH: number | null }
export interface TurnoDTO { id: string; nombre: string; personas: number; activo: boolean; orden: number; horarioDias: HorarioDiaDTO[] }
export interface ConfigDTO { tipo: string; kgPorHora: number | null; kgPorHH: number | null; minsPorBatch: number | null; kgPorBatch: number | null; golpesPorMinuto: number | null; setupMin: number | null; setPointMin: number | null; formatosDia: number | null; actualizadoPor: string | null; actualizadoEn: string | null }
export interface LineaConfigDTO { id: string; nombre: string; tipo: string; activa: boolean; orden: number; turnos: TurnoDTO[]; config: ConfigDTO | null }

const parseHora = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh + mm / 60 }
const hhDe = (h: HorarioDiaDTO) => (h.opera && h.ingreso && h.salida ? Math.round((parseHora(h.salida) - parseHora(h.ingreso) - h.colacion) * 100) / 100 : 0)

/** Carga todas las líneas con turnos, horarios y productividad. */
export async function getLineasConfig(): Promise<LineaConfigDTO[]> {
  const lineas = await prisma.linea.findMany({
    orderBy: { orden: 'asc' },
    include: {
      config: true,
      turnos: { orderBy: { orden: 'asc' }, include: { horarioDias: { orderBy: { dia: 'asc' } } } },
    },
  })
  return lineas.map((l) => ({
    id: l.id, nombre: l.nombre, tipo: l.tipo, activa: l.activa, orden: l.orden,
    config: l.config ? {
      tipo: l.config.tipo, kgPorHora: l.config.kgPorHora, kgPorHH: l.config.kgPorHH,
      minsPorBatch: l.config.minsPorBatch, kgPorBatch: l.config.kgPorBatch,
      golpesPorMinuto: l.config.golpesPorMinuto, setupMin: l.config.setupMin, setPointMin: l.config.setPointMin, formatosDia: l.config.formatosDia,
      actualizadoPor: l.config.actualizadoPor, actualizadoEn: l.config.actualizadoEn.toISOString(),
    } : null,
    turnos: l.turnos.map((t) => ({
      id: t.id, nombre: t.nombre, personas: t.personas, activo: t.activo, orden: t.orden,
      horarioDias: t.horarioDias.map((h) => ({ dia: h.dia, opera: h.opera, ingreso: h.ingreso, salida: h.salida, colacion: h.colacion, HH: h.HH })),
    })),
  }))
}

/** Horario de un turno para un día (1..7). */
function horarioDe(t: TurnoDTO, dia: number): HorarioDiaDTO | null {
  return t.horarioDias.find((h) => h.dia === dia) ?? null
}

/** Líneas que comparten equipo (no sumar sus capacidades): Molida + Hamburguesas + Albóndigas. */
export function comparteEquipo(tipo: string): boolean {
  return tipo === 'molida' || tipo === 'ventana'
}

/**
 * Ventana de disponibilidad (Molida / Hamburguesas / Albóndigas):
 * ingreso del primer turno → salida del último, menos colaciones, setup y set points.
 * Los set points solo se descuentan cuando opera el día completo (≥ 2 turnos).
 */
function ventanaDisponible(l: LineaConfigDTO, dia: number, c: ConfigDTO) {
  const hs = l.turnos.filter((t) => t.activo).map((t) => horarioDe(t, dia))
    .filter((h): h is HorarioDiaDTO => !!h && h.opera && !!h.ingreso && !!h.salida)
  if (hs.length === 0) return null
  const ingresoH = hs.reduce((m, h) => (parseHora(h.ingreso!) < parseHora(m.ingreso!) ? h : m), hs[0])
  const salidaH = hs.reduce((m, h) => (parseHora(h.salida!) > parseHora(m.salida!) ? h : m), hs[0])
  const ingreso = parseHora(ingresoH.ingreso!)
  const salida = parseHora(salidaH.salida!)
  const colacion = hs.reduce((a, h) => a + h.colacion, 0)
  const setup = (c.setupMin ?? 30) / 60
  const setpoints = hs.length >= 2 ? (Math.max(0, (c.formatosDia ?? 6) - 1) * (c.setPointMin ?? 6)) / 60 : 0
  const bruta = salida - ingreso
  const disponible = bruta - colacion - setup - setpoints
  const r1 = (n: number) => Math.round(n * 100) / 100
  return { hs, ingresoStr: ingresoH.ingreso!, salidaStr: salidaH.salida!, colacion, setup, setpoints, bruta: r1(bruta), disponible: r1(disponible), turnos: hs.length }
}

/** Capacidad (kg) de una línea para un día (1=Lun … 7=Dom), según su tipo. */
export function capacidadDiaDeLinea(l: LineaConfigDTO, dia: number): number {
  const c = l.config
  if (!c) return 0
  const turnos = l.turnos.filter((t) => t.activo)

  if (l.tipo === 'kg_hh') {
    return Math.round(turnos.reduce((tot, t) => {
      const h = horarioDe(t, dia)
      if (!h || !h.opera) return tot
      const hh = h.HH ?? hhDe(h)
      return tot + hh * t.personas * (c.kgPorHH ?? 0)
    }, 0))
  }

  if (l.tipo === 'batch') {
    const hs = turnos.map((t) => horarioDe(t, dia)).filter((h): h is HorarioDiaDTO => !!h && h.opera && !!h.ingreso && !!h.salida)
    if (hs.length === 0) return 0
    const ingreso = Math.min(...hs.map((h) => parseHora(h.ingreso!)))
    const salida = Math.max(...hs.map((h) => parseHora(h.salida!)))
    const colacion = hs.reduce((a, h) => a + h.colacion, 0)
    const ventana = (salida - ingreso) - colacion
    return Math.round(ventana * (60 / (c.minsPorBatch ?? 20)) * (c.kgPorBatch ?? 0))
  }

  if (l.tipo === 'molida' || l.tipo === 'ventana') {
    // Molida / Hamburguesas / Albóndigas: ventana de disponibilidad × kg/hora
    const v = ventanaDisponible(l, dia, c)
    if (!v) return 0
    return Math.round(v.disponible * (c.kgPorHora ?? 0))
  }

  // kg_hora: un turno; HH del día × kg/hora
  const t = turnos[0]
  const h = t ? horarioDe(t, dia) : null
  if (!h || !h.opera) return 0
  const hh = h.HH ?? hhDe(h)
  return Math.round(hh * (c.kgPorHora ?? 0))
}

/** ¿La línea opera ese día? */
export function operaDia(l: LineaConfigDTO, dia: number): boolean {
  return l.turnos.some((t) => t.activo && (horarioDe(t, dia)?.opera ?? false))
}

/** Texto de detalle (tooltip) de una línea para un día. */
export function detalleDiaDeLinea(l: LineaConfigDTO, dia: number, cap: number): string {
  const c = l.config
  const turnos = l.turnos.filter((t) => t.activo)
  if (!c) return ''
  if (l.tipo === 'kg_hh') {
    const parts = turnos.map((t) => { const h = horarioDe(t, dia); if (!h || !h.opera) return null; const hh = h.HH ?? hhDe(h); return `  ↳ ${t.nombre} (${t.personas} pers × ${hh}h): ${Math.round(hh * t.personas * (c.kgPorHH ?? 0)).toLocaleString('es-CL')} kg` }).filter(Boolean)
    return parts.join('\n')
  }
  if (l.tipo === 'batch') {
    const hs = turnos.map((t) => ({ t, h: horarioDe(t, dia) })).filter((x) => x.h && x.h.opera)
    if (!hs.length) return ''
    const ing = Math.min(...hs.map((x) => parseHora(x.h!.ingreso!)))
    const sal = Math.max(...hs.map((x) => parseHora(x.h!.salida!)))
    const col = hs.reduce((a, x) => a + (x.h!.colacion), 0)
    const ventana = Math.round(((sal - ing) - col) * 10) / 10
    const lines = hs.map((x) => `  ↳ ${x.t.nombre}: ${x.h!.ingreso}–${x.h!.salida} (${x.h!.HH ?? hhDe(x.h!)}h)`)
    lines.push(`  ↳ Ventana total: ${ventana}h disponibles`, `  ↳ ${Math.round(60 / (c.minsPorBatch ?? 20))} batches/h × ${(c.kgPorBatch ?? 0).toLocaleString('es-CL')} kg`)
    return lines.join('\n')
  }
  const fmtH = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

  if (l.tipo === 'molida') {
    const v = ventanaDisponible(l, dia, c)
    if (!v) return ''
    const cambios = v.turnos >= 2 ? Math.max(0, (c.formatosDia ?? 6) - 1) : 0
    return [
      `  ↳ Ventana: ${v.ingresoStr}–${v.salidaStr} = ${fmtH(v.bruta)}h brutas`,
      `  ↳ Colación: −${fmtH(v.colacion)}h`,
      `  ↳ Setup inicio: −${fmtH(v.setup)}h`,
      `  ↳ Set points (${cambios}×${c.setPointMin ?? 6}min): −${fmtH(v.setpoints)}h`,
      `  ↳ Disponible: ${fmtH(v.disponible)}h × ${(c.kgPorHora ?? 0).toLocaleString('es-CL')} kg/h = ${cap.toLocaleString('es-CL')} kg`,
      `  ──────────────────────────────`,
      `  Secuencia: 4%→7%→10% (SISA→JUMBO por formato)`,
      `  ${c.golpesPorMinuto ?? 90} golpes/min · 250g SISA / 500g JUMBO`,
    ].join('\n')
  }

  if (l.tipo === 'ventana') {
    const v = ventanaDisponible(l, dia, c)
    if (!v) return ''
    const noProd = Math.round((v.setup + v.setpoints) * 10) / 10
    return [
      `  ↳ Ventana: ${v.ingresoStr}–${v.salidaStr} = ${fmtH(v.bruta)}h brutas`,
      `  ↳ Colación: −${fmtH(v.colacion)}h${noProd > 0 ? ` · No productivo: −${fmtH(noProd)}h` : ''}`,
      `  ↳ Disponible: ${fmtH(v.disponible)}h × ${(c.kgPorHora ?? 0).toLocaleString('es-CL')} kg/h = ${cap.toLocaleString('es-CL')} kg`,
      `  ↳ Productividad fija — no escala con dotación`,
      `  ⚠ Comparte equipo con Molida — capacidad expresada como turno completo`,
    ].join('\n')
  }

  // kg_hora: rendimiento fijo del equipo (no escala con dotación)
  const t = turnos[0]; const h = t ? horarioDe(t, dia) : null
  if (!h || !h.opera) return ''
  const hh = h.HH ?? hhDe(h)
  return [
    `  ↳ Ingreso: ${h.ingreso} · Salida: ${h.salida}`,
    `  ↳ Colación: −${h.colacion}h`,
    `  ↳ Disponible: ${hh}h × ${(c.kgPorHora ?? 0).toLocaleString('es-CL')} kg/h = ${cap.toLocaleString('es-CL')} kg`,
    `  ↳ Rendimiento fijo — no escala con dotación`,
  ].join('\n')
}

/** Horas disponibles del día para líneas de ventana (Molida / Hamburguesas / Albóndigas). */
export function horasDisponiblesMolida(l: LineaConfigDTO, dia: number): number {
  if (!l.config) return 0
  const v = ventanaDisponible(l, dia, l.config)
  return v ? v.disponible : 0
}

/** CAMBIO 5: capacidad de una línea por id y día. */
export async function getCapacidadLinea(lineaId: string, dia: number): Promise<number> {
  const lineas = await getLineasConfig()
  const l = lineas.find((x) => x.id === lineaId)
  return l ? capacidadDiaDeLinea(l, dia) : 0
}

export interface CeldaSemanal { ymd: string; opera: boolean; capacidad: number; tooltip: string }
export interface LineaSemanal { id: string; nombre: string; tipo: string; comparteEquipo: boolean; celdas: CeldaSemanal[]; totalSemana: number }
export interface CapacidadSemanal { dias: { ymd: string; dia: number }[]; lineas: LineaSemanal[]; totalDia: number[]; totalSemana: number }

const isoDow = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); const w = new Date(y, m - 1, d).getDay(); return w === 0 ? 7 : w }

/** CAMBIO 5: matriz líneas × días para la vista semanal (capacidad desde BD). */
export async function getCapacidadSemanal(diasYmd: string[]): Promise<CapacidadSemanal> {
  const config = await getLineasConfig()
  const dias = diasYmd.map((ymd) => ({ ymd, dia: isoDow(ymd) }))

  const lineas: LineaSemanal[] = config.filter((l) => l.activa).map((l) => {
    const celdas: CeldaSemanal[] = dias.map(({ ymd, dia }) => {
      const op = operaDia(l, dia)
      const cap = op ? capacidadDiaDeLinea(l, dia) : 0
      return { ymd, opera: op, capacidad: cap, tooltip: op ? detalleDiaDeLinea(l, dia, cap) : '' }
    })
    return { id: l.id, nombre: l.nombre, tipo: l.tipo, comparteEquipo: comparteEquipo(l.tipo), celdas, totalSemana: celdas.reduce((a, c) => a + c.capacidad, 0) }
  })

  const totalDia = dias.map((_, i) => lineas.reduce((a, l) => a + l.celdas[i].capacidad, 0))
  return { dias, lineas, totalDia, totalSemana: totalDia.reduce((a, b) => a + b, 0) }
}
