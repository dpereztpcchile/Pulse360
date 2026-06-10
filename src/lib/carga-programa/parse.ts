// PULSE 360 — Carga de Programa: parseo y validación del Excel diario.
// Carnicería se lee de la hoja "CARNICERÍA" (tabla rosada PROLIJADO).
// Molienda se lee de la hoja "MOLIDA".
import * as XLSX from 'xlsx'

export const SHEET_CARNICERIA = 'CARNICERÍA'
export const SHEET_MOLIDA = 'MOLIDA'

export interface CorteParsed {
  sku: string | null
  nombre: string
  rendTeorico: number
  kgPTPlan: number
  kgMPTeorico: number
  prodObjetivo: number
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

export interface OrdenParsed {
  numeroOF: string
  producto: string
  cantidadPlanificada: number
  unidad: string | null
  fecha: string | null // YYYY-MM-DD
}

/** Convierte fecha SAP (entero días desde 1899-12-30) o Date/texto a "YYYY-MM-DD". */
function fechaSAP(v: unknown): string | null {
  if (v == null || String(v).trim() === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)
  const n = Number(v)
  if (!Number.isNaN(n) && n > 0 && n < 100000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const d2 = new Date(String(v).trim())
  return Number.isNaN(d2.getTime()) ? null : d2.toISOString().slice(0, 10)
}

export interface ParseResult {
  ok: boolean
  error?: string
  carniceria: CorteParsed[]
  molienda: MolidaParsed[]
  dotacion: number | null
  ordenes: OrdenParsed[]
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

/** Busca una hoja por token normalizado (sin acentos). Exacto primero, luego "incluye". */
function findSheet(wb: XLSX.WorkBook, token: string): XLSX.WorkSheet | null {
  const exact = wb.SheetNames.find((n) => norm(n) === token)
  if (exact) return wb.Sheets[exact]
  const inc = wb.SheetNames.find((n) => norm(n).includes(token))
  return inc ? wb.Sheets[inc] : null
}

// ── Hoja CARNICERÍA → tabla rosada PROLIJADO ──
function parseCarniceriaSheet(ws: XLSX.WorkSheet): CorteParsed[] {
  const aoa = aoaOf(ws)
  // Cabecera: primera fila con "producto" y una columna que incluya "mp"
  let hIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    const row = aoa[i] || []
    if (row.some((c) => norm(c) === 'producto') && row.some((c) => norm(c).includes('mp'))) { hIdx = i; break }
  }
  if (hIdx < 0) return []

  const header = (aoa[hIdx] || []).map((c) => norm(c))
  const idxProd = header.findIndex((h) => h === 'producto')
  const idxPedido = header.findIndex((h) => h.includes('pedido'))
  const idxRend = header.findIndex((h) => h.includes('rend'))
  const idxMP = header.findIndex((h) => h.includes('mp'))
  const idxObj = header.findIndex((h) => h.includes('prod pt') || h.includes('kg/hh'))
  const idxHI = header.findIndex((h) => h === 'hi')
  const htIdxs = header.map((h, i) => (h === 'ht' ? i : -1)).filter((i) => i >= 0)
  const idxHT = htIdxs.find((i) => i > idxHI) ?? (htIdxs.length ? htIdxs[htIdxs.length - 1] : -1)
  if (idxProd < 0) return []

  // Solo la primera tabla contigua (PROLIJADO): cortar al primer hueco/total.
  const out: CorteParsed[] = []
  let started = false
  for (let i = hIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] || []
    const name = str(row[idxProd])
    if (isBlankRow(row) || !name || norm(name) === 'total' || /^[\d.,]+$/.test(name)) { if (started) break; continue }
    let rend = num(idxRend >= 0 ? row[idxRend] : '')
    if (rend > 0 && rend <= 1) rend = rend * 100
    const kgPTPlan = num(idxPedido >= 0 ? row[idxPedido] : '')
    let kgMPTeorico = idxMP >= 0 ? num(row[idxMP]) : 0
    if (kgMPTeorico <= 0 && rend > 0) kgMPTeorico = (kgPTPlan / (rend / 100))
    if (kgPTPlan <= 0 && kgMPTeorico <= 0) { if (started) break; continue }
    out.push({
      sku: null,
      nombre: name,
      rendTeorico: Math.round(rend * 10) / 10,
      kgPTPlan: Math.round(kgPTPlan * 10) / 10,
      kgMPTeorico: Math.round(kgMPTeorico * 10) / 10,
      prodObjetivo: idxObj >= 0 ? num(row[idxObj]) || 60 : 60,
      hiTeorico: idxHI >= 0 ? horaFromCell(row[idxHI]) : null,
      htTeorico: idxHT >= 0 ? horaFromCell(row[idxHT]) : null,
    })
    started = true
  }
  return out
}

/** Dotación: valor numérico junto a "CANTIDAD DE CARNICEROS". */
function parseDotacionCarniceria(ws: XLSX.WorkSheet): number | null {
  const aoa = aoaOf(ws)
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const row = aoa[i] || []
    if (row.some((c) => norm(c).includes('carnicero'))) {
      for (const cell of row) { const n = num(cell); if (n > 0) return Math.round(n) }
    }
  }
  return null
}

// Tamaño de batch de referencia (kg) cuando la hoja no trae el N° de batches.
const KG_POR_BATCH = 900

// ── Hoja MOLIDA → Molienda. Soporta 2 formatos:
//   A) tabla "Producto / Q Batch / Kg / B / TOTAL"
//   B) tabla "SKU / Productos / … / Kilos" (sin batches → se derivan por KG_POR_BATCH)
function parseMolidaSheet(ws: XLSX.WorkSheet): MolidaParsed[] {
  const aoa = aoaOf(ws)
  let hIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const row = aoa[i] || []
    const hasProd = row.some((c) => norm(c) === 'producto' || norm(c) === 'productos')
    const hasData = row.some((c) => norm(c).includes('batch') || norm(c) === 'kilos')
    if (hasProd && hasData) { hIdx = i; break }
  }
  if (hIdx < 0) return []

  const header = (aoa[hIdx] || []).map((c) => norm(c))
  let idxQBatch = header.findIndex((h) => h.includes('q batch'))
  if (idxQBatch < 0) idxQBatch = header.findIndex((h) => h.includes('batch'))
  const idxKgB = header.findIndex((h) => h === 'kg / b' || h === 'kg/b' || h.includes('kg / b'))
  const idxTotal = header.findIndex((h) => h === 'total')
  const idxKilos = header.findIndex((h) => h === 'kilos')
  let idxProd = -1
  for (let j = 0; j < header.length; j++) if ((header[j] === 'producto' || header[j] === 'productos') && (idxQBatch < 0 || j < idxQBatch)) idxProd = j
  if (idxProd < 0) idxProd = header.findIndex((h) => h === 'producto' || h === 'productos')
  if (idxProd < 0) return []

  const formatoBatch = idxQBatch >= 0
  if (!formatoBatch && idxKilos < 0) return []

  const out: MolidaParsed[] = []
  let started = false
  for (let i = hIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] || []
    const name = str(row[idxProd])
    if (isBlankRow(row) || !name || norm(name) === 'total' || /^[\d.,]+$/.test(name)) { if (started) break; continue }

    let numBatches: number
    let kgBatch: number
    let kgTotal: number
    if (formatoBatch) {
      numBatches = Math.round(num(row[idxQBatch]))
      if (numBatches <= 0) { if (started) break; continue }
      kgBatch = idxKgB >= 0 ? num(row[idxKgB]) : 0
      kgTotal = idxTotal >= 0 ? num(row[idxTotal]) : 0
      if (kgTotal <= 0) kgTotal = numBatches * kgBatch
    } else {
      kgTotal = num(row[idxKilos])
      if (kgTotal <= 0) { if (started) break; continue }
      numBatches = Math.max(1, Math.round(kgTotal / KG_POR_BATCH))
      kgBatch = Math.round((kgTotal / numBatches) * 10) / 10
    }

    out.push({ productoNombre: name, kgPorHora: 0, numBatches, horas: 0, kgTotal, kgBatch, hrInicio: null, hrTermino: null })
    started = true
  }
  return out
}

// ── Órdenes de Fabricación (sábana SAP) ──
// El archivo repite cada OF en varias filas (una por componente de la receta).
// Se agrupa por "Número de documento" tomando solo los valores de cabecera.
// Tolerante a columnas extra, orden distinto y a cualquier hoja del libro.
function parseOrdenesFromWorkbook(wb: XLSX.WorkBook): OrdenParsed[] {
  for (const name of wb.SheetNames) {
    const aoa = aoaOf(wb.Sheets[name])
    let hIdx = -1, idxNum = -1, idxProd = -1, idxCant = -1, idxUM = -1, idxFecha = -1
    for (let i = 0; i < Math.min(aoa.length, 15); i++) {
      const header = (aoa[i] || []).map((c) => norm(c))
      // Número de documento (= numeroOF). OJO: "UM ... en la orden de fabricación" NO debe usarse aquí.
      let oNum = header.findIndex((h) => h === 'numero de documento' || h.includes('numero de documento'))
      if (oNum < 0) oNum = header.findIndex((h) => h.includes('documento'))
      if (oNum < 0) oNum = header.findIndex((h) => h === 'of')
      // Descripción de producto (texto). NO el "Número de producto/artículo".
      let oProd = header.findIndex((h) => h.includes('descripcion de producto') || h.includes('descripcion producto'))
      if (oProd < 0) oProd = header.findIndex((h) => h.includes('descripcion') && !h.includes('articulo'))
      if (oProd < 0) oProd = header.findIndex((h) => h.includes('producto') && !h.includes('numero'))
      // Cantidad planificada - Cabecera (no "- Filas")
      let oCant = header.findIndex((h) => h.includes('cantidad planificada') && h.includes('cabecera'))
      if (oCant < 0) oCant = header.findIndex((h) => h.includes('cantidad planificada') && !h.includes('fila'))
      if (oCant < 0) oCant = header.findIndex((h) => h.includes('planificada') && !h.includes('fila'))
      if (oNum >= 0 && oProd >= 0 && oCant >= 0 && oNum !== oProd && oNum !== oCant && oProd !== oCant) {
        hIdx = i; idxNum = oNum; idxProd = oProd; idxCant = oCant
        idxUM = header.findIndex((h) => h.includes('um inventario') || h === 'um' || h.includes('unidad de medida'))
        idxFecha = header.findIndex((h) => h.includes('fecha del pedido') || h.includes('fecha pedido'))
        if (idxFecha < 0) idxFecha = header.findIndex((h) => h.includes('fecha'))
        break
      }
    }
    if (hIdx < 0) continue

    // Agrupar por número de documento (cabecera idéntica en todas las filas de la OF)
    const map = new Map<string, OrdenParsed>()
    for (let i = hIdx + 1; i < aoa.length; i++) {
      const row = aoa[i] || []
      const numeroOF = str(row[idxNum])
      if (isBlankRow(row) || !numeroOF || norm(numeroOF) === 'total') continue
      if (map.has(numeroOF)) continue
      map.set(numeroOF, {
        numeroOF,
        producto: str(row[idxProd]) ?? '',
        cantidadPlanificada: num(row[idxCant]),
        unidad: idxUM >= 0 ? str(row[idxUM]) : null,
        fecha: idxFecha >= 0 ? fechaSAP(row[idxFecha]) : null,
      })
    }
    if (map.size) return Array.from(map.values())
  }
  return []
}

export function parseWorkbook(wb: XLSX.WorkBook): ParseResult {
  const wsCarn = findSheet(wb, 'carniceria')
  const wsMol = findSheet(wb, 'molida')
  const carniceria = wsCarn ? parseCarniceriaSheet(wsCarn) : []
  const dotacion = wsCarn ? parseDotacionCarniceria(wsCarn) : null
  const molienda = wsMol ? parseMolidaSheet(wsMol) : []
  const ordenes = parseOrdenesFromWorkbook(wb)

  if (carniceria.length === 0 && molienda.length === 0 && ordenes.length === 0) {
    return {
      ok: false,
      error: 'No se reconoció el contenido. Se espera un programa (hojas "CARNICERÍA"/"MOLIDA") o un archivo SAP con columnas OF, Producto y Cantidad.',
      carniceria: [], molienda: [], dotacion: null, ordenes: [],
    }
  }

  return { ok: true, carniceria, molienda, dotacion, ordenes }
}
