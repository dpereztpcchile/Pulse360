// PULSE 360 — Carga de Programa: parseo y validación del Excel diario.
// Hojas requeridas: "BISTEC-TROZOS" (Carnicería) y "MOLIDA" (Molienda).
// El archivo real tiene filas de título arriba y sub-tablas apiladas, por eso
// el parseo localiza la fila de encabezados y lee por índice de columna,
// cortando al primer hueco para no leer tablas vecinas.
import * as XLSX from 'xlsx'

export const SHEET_BISTEC = 'BISTEC-TROZOS'
export const SHEET_MOLIDA = 'MOLIDA'
export const REQUIRED_SHEETS = [SHEET_BISTEC, SHEET_MOLIDA]

export interface CorteParsed {
  sku: string | null
  nombre: string
  rendTeorico: number
  kgPTPlan: number
  kgMPTeorico: number
  hiTeorico: string | null
  htTeorico: string | null
}

export interface MolidaParsed {
  productoNombre: string
  kgPorHora: number
  numBatches: number
  horas: number
  kgBatch: number
  kgTotal: number
  hrInicio: string | null
  hrTermino: string | null
}

export interface ParseResult {
  ok: boolean
  error?: string
  carniceria: CorteParsed[]
  molienda: MolidaParsed[]
}

const DIACRITICS = /[̀-ͯ]/g
const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim()
const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}
const str = (v: unknown): string | null => (v == null || String(v).trim() === '' ? null : String(v).trim())

/** Convierte una celda de hora Excel (fracción de día, ej. 0.25) a "HH:MM". Texto se devuelve tal cual. */
function horaFromCell(v: unknown): string | null {
  if (v == null || String(v).trim() === '') return null
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const totalMin = Math.round(v * 24 * 60)
    return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
  }
  return str(v)
}

const isBlankRow = (row: unknown[]) => row.every((c) => c == null || String(c).trim() === '')
const aoaOf = (ws: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: true, defval: '' })

// ── BISTEC-TROZOS → Carnicería ──
function parseCarniceriaSheet(ws: XLSX.WorkSheet): CorteParsed[] {
  const aoa = aoaOf(ws)
  let hIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const row = aoa[i] || []
    if (row.some((c) => norm(c) === 'sku') && row.some((c) => norm(c) === 'producto')) { hIdx = i; break }
  }
  if (hIdx < 0) return []

  const header = (aoa[hIdx] || []).map((c) => norm(c))
  const idxSku = header.findIndex((h) => h === 'sku')
  const idxProd = header.findIndex((h) => h === 'producto')
  const idxRend = header.findIndex((h) => h.includes('rend'))
  const idxPedido = header.findIndex((h) => h.includes('pedido'))
  let idxMP = header.findIndex((h) => h === 'mp kg')
  if (idxMP < 0) idxMP = header.findIndex((h) => h.includes('mp'))
  const idxHI = header.findIndex((h) => h.includes('hora inicio'))
  const idxHT = header.findIndex((h) => h.includes('hora termino') || h.includes('hora término'))
  if (idxProd < 0) return []

  const out: CorteParsed[] = []
  let started = false
  for (let i = hIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] || []
    const name = str(row[idxProd])
    if (isBlankRow(row) || !name || norm(name) === 'total') { if (started) break; continue }
    let rend = num(row[idxRend])
    if (rend > 0 && rend <= 1) rend = rend * 100 // viene en fracción (0.51) → 51
    const kgPTPlan = num(row[idxPedido])
    const mpKg = idxMP >= 0 ? num(row[idxMP]) : 0
    const kgMPTeorico = mpKg > 0 ? mpKg : rend > 0 ? kgPTPlan / (rend / 100) : 0
    if (kgPTPlan <= 0 && kgMPTeorico <= 0) { if (started) break; continue }
    out.push({
      sku: idxSku >= 0 ? str(row[idxSku]) : null,
      nombre: name,
      rendTeorico: Math.round(rend * 10) / 10,
      kgPTPlan: Math.round(kgPTPlan * 10) / 10,
      kgMPTeorico: Math.round(kgMPTeorico * 10) / 10,
      hiTeorico: idxHI >= 0 ? horaFromCell(row[idxHI]) : null,
      htTeorico: idxHT >= 0 ? horaFromCell(row[idxHT]) : null,
    })
    started = true
  }
  return out
}

// ── MOLIDA → Molienda (tabla "Producto / Q Batch / Kg / B / TOTAL") ──
function parseMolidaSheet(ws: XLSX.WorkSheet): MolidaParsed[] {
  const aoa = aoaOf(ws)
  let hIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const row = aoa[i] || []
    if (row.some((c) => norm(c).includes('batch')) && row.some((c) => norm(c) === 'producto')) { hIdx = i; break }
  }
  if (hIdx < 0) return []

  const header = (aoa[hIdx] || []).map((c) => norm(c))
  let idxQBatch = header.findIndex((h) => h.includes('q batch'))
  if (idxQBatch < 0) idxQBatch = header.findIndex((h) => h.includes('batch'))
  const idxKgB = header.findIndex((h) => h === 'kg / b' || h === 'kg/b' || h.includes('kg / b'))
  const idxTotal = header.findIndex((h) => h === 'total')
  let idxProd = -1
  for (let j = 0; j < header.length; j++) if (header[j] === 'producto' && (idxQBatch < 0 || j < idxQBatch)) idxProd = j
  if (idxProd < 0) idxProd = header.findIndex((h) => h === 'producto')
  if (idxProd < 0 || idxQBatch < 0) return []

  const out: MolidaParsed[] = []
  let started = false
  for (let i = hIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] || []
    const name = str(row[idxProd])
    if (isBlankRow(row) || !name || norm(name) === 'total' || /^[\d.,]+$/.test(name)) { if (started) break; continue }
    const numBatches = Math.round(num(row[idxQBatch]))
    if (numBatches <= 0) { if (started) break; continue }
    const kgBatch = idxKgB >= 0 ? num(row[idxKgB]) : 0
    let kgTotal = idxTotal >= 0 ? num(row[idxTotal]) : 0
    if (kgTotal <= 0) kgTotal = numBatches * kgBatch
    out.push({ productoNombre: name, kgPorHora: 0, numBatches, horas: 0, kgTotal, kgBatch, hrInicio: null, hrTermino: null })
    started = true
  }
  return out
}

/** Valida que el workbook tenga ambas hojas requeridas. Devuelve la hoja faltante o null. */
export function missingSheet(wb: XLSX.WorkBook): string | null {
  for (const s of REQUIRED_SHEETS) if (!wb.Sheets[s]) return s
  return null
}

export function parseWorkbook(wb: XLSX.WorkBook): ParseResult {
  const falta = missingSheet(wb)
  if (falta) {
    return { ok: false, error: `El archivo no contiene la hoja requerida "${falta}".`, carniceria: [], molienda: [] }
  }

  const carniceria = parseCarniceriaSheet(wb.Sheets[SHEET_BISTEC])
  const molienda = parseMolidaSheet(wb.Sheets[SHEET_MOLIDA])

  if (carniceria.length === 0 && molienda.length === 0) {
    return { ok: false, error: 'No se pudieron leer cortes ni productos. Verifica que las hojas "BISTEC-TROZOS" y "MOLIDA" tengan las columnas esperadas (SKU, Producto, Pedido, % Rend, Q Batch, Kg / B…).', carniceria: [], molienda: [] }
  }

  return { ok: true, carniceria, molienda }
}
