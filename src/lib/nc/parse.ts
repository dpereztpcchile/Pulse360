// PULSE 360 — No Conformidades: parser del Excel real "SEGUIMIENTO NC.xlsx".
// Lee la hoja "CUADRO DE SEGUIMIENTO NC" (21 columnas). La carga semanal
// reemplaza el archivo completo; el dedup/merge por ncNumber se hace en la
// capa de importación (API), no aquí — este módulo solo parsea y valida filas.
import * as XLSX from 'xlsx'
import { mapDestino, mapEstadoNc, mapResponsable, mapGestionado } from './constants'

export const SHEET_NC = 'CUADRO DE SEGUIMIENTO NC'

export interface NcRowParsed {
  ncNumber: number
  fecha: string // ISO (YYYY-MM-DD)
  semana: number
  producto: string
  razon: string
  cantidadKg: number
  valorProductoOC: number | null
  valorNcOC: number | null
  destino: 'VENTA_A_TERCEROS' | 'DECOMISO' | 'DEVOLUCION' | 'RETENIDO' | 'OTRO'
  precioVentaTercero: number | null
  valorVentaNc: number | null
  costoPlanta: number | null
  responsable: 'PROVEEDOR' | 'PLANTA' | null
  sif: string | null
  proveedor: string | null
  oc: string | null
  estadoNc: 'VENDIDO' | 'TRANSFERIDA' | 'D_CHILEMINK' | 'STANBY' | null
  fechaDisposicion: string | null
  camara: string | null
  gestionado: boolean
}

export interface NcRowIssue {
  rowNumber: number // fila del Excel (1-indexed, incluye header)
  ncNumber: number | null
  message: string
}

export interface NcParseResult {
  ok: boolean
  error?: string
  rows: NcRowParsed[]
  issues: NcRowIssue[] // filas con datos faltantes/inválidos que se omitieron
  totalRowsInSheet: number
}

const DIACRITICS = /[̀-ͯ]/g
const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim()
const str = (v: unknown): string | null => (v == null || String(v).trim() === '' ? null : String(v).trim())
const num = (v: unknown): number | null => {
  if (v == null || String(v).trim() === '') return null
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

/** Convierte fecha serial de Excel (días desde 1899-12-30) o Date/texto a "YYYY-MM-DD". */
function excelDate(v: unknown): string | null {
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

const aoaOf = (ws: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: true, defval: '' })

/** Busca la hoja de NC por nombre normalizado (tolerante a mayúsculas/acentos). */
function findNcSheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  const target = norm(SHEET_NC)
  const exact = wb.SheetNames.find((n) => norm(n) === target)
  if (exact) return wb.Sheets[exact]
  const inc = wb.SheetNames.find((n) => norm(n).includes('seguimiento nc'))
  return inc ? wb.Sheets[inc] : null
}

/** Índices de columnas por texto de cabecera normalizado (match exacto, con alias de respaldo). */
function findColumns(header: string[]) {
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = header.indexOf(c)
      if (i >= 0) return i
    }
    // respaldo: includes()
    for (const c of candidates) {
      const i = header.findIndex((h) => h.includes(c))
      if (i >= 0) return i
    }
    return -1
  }
  return {
    fecha: find('fecha'),
    semana: find('semana'),
    ncNumber: find('n. de nc', 'n de nc', 'nro de nc', 'numero de nc'),
    producto: find('producto'),
    razon: find('razon'),
    cantidadKg: find('cantidad kg'),
    valorProductoOC: find('valor producto segun oc'),
    valorNcOC: find('valor de nc segun oc'),
    destino: find('destino'),
    precioVentaTercero: find('$ venta tercero', 'venta tercero'),
    valorVentaNc: find('valor venta nc'),
    costoPlanta: find('costo planta'),
    responsable: find('responsable'),
    sif: find('sif'),
    proveedor: find('proovedor', 'proveedor'),
    oc: find('oc'),
    estadoNc: find('estado nc'),
    fechaDisposicion: find('f. disposicion', 'f disposicion', 'fecha disposicion'),
    camara: find('camara'),
    reclamoProveedor: find('reclamo proveedor'),
  }
}

const isBlankRow = (row: unknown[]) => row.every((c) => c == null || String(c).trim() === '')

/**
 * Parsea el workbook del Excel "SEGUIMIENTO NC.xlsx" y devuelve las filas válidas
 * de la hoja "CUADRO DE SEGUIMIENTO NC", más la lista de filas omitidas por datos
 * faltantes (fecha, N° de NC, producto, razón, cantidad o responsable inválidos).
 */
export function parseNcWorkbook(wb: XLSX.WorkBook): NcParseResult {
  const ws = findNcSheet(wb)
  if (!ws) {
    return {
      ok: false,
      error: `No se encontró la hoja "${SHEET_NC}" en el archivo.`,
      rows: [], issues: [], totalRowsInSheet: 0,
    }
  }

  const aoa = aoaOf(ws)
  if (aoa.length === 0) {
    return { ok: false, error: 'La hoja de NC está vacía.', rows: [], issues: [], totalRowsInSheet: 0 }
  }

  const header = (aoa[0] || []).map((c) => norm(c))
  const col = findColumns(header)

  const requiredMissing = Object.entries({
    fecha: col.fecha, ncNumber: col.ncNumber, producto: col.producto, razon: col.razon,
    cantidadKg: col.cantidadKg, destino: col.destino, responsable: col.responsable,
  }).filter(([, idx]) => idx < 0).map(([k]) => k)

  if (requiredMissing.length > 0) {
    return {
      ok: false,
      error: `No se reconocieron las columnas: ${requiredMissing.join(', ')}. Verifique que el archivo tenga el formato esperado de "${SHEET_NC}".`,
      rows: [], issues: [], totalRowsInSheet: 0,
    }
  }

  const rows: NcRowParsed[] = []
  const issues: NcRowIssue[] = []
  let totalRowsInSheet = 0

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] || []
    if (isBlankRow(row)) continue
    totalRowsInSheet++

    const rowNumber = i + 1 // 1-indexed incl. header, para mostrar al usuario
    const ncNumberRaw = num(row[col.ncNumber])
    const fechaRaw = excelDate(row[col.fecha])
    const producto = str(row[col.producto])
    const razon = str(row[col.razon])
    const cantidadKg = num(row[col.cantidadKg])
    const destinoRaw = str(row[col.destino])
    const responsableRaw = str(row[col.responsable])

    if (!ncNumberRaw || !Number.isFinite(ncNumberRaw)) {
      issues.push({ rowNumber, ncNumber: null, message: 'N° de NC vacío o inválido — fila omitida' })
      continue
    }
    const ncNumber = Math.round(ncNumberRaw)
    if (!fechaRaw) {
      issues.push({ rowNumber, ncNumber, message: 'Fecha vacía o inválida — fila omitida' })
      continue
    }
    if (!producto) {
      issues.push({ rowNumber, ncNumber, message: 'Producto vacío — fila omitida' })
      continue
    }
    if (!razon) {
      issues.push({ rowNumber, ncNumber, message: 'Razón vacía — fila omitida' })
      continue
    }
    if (cantidadKg == null) {
      issues.push({ rowNumber, ncNumber, message: 'Cantidad KG vacía o inválida — fila omitida' })
      continue
    }
    const responsable = mapResponsable(responsableRaw)
    if (!responsable) {
      issues.push({ rowNumber, ncNumber, message: `Responsable "${responsableRaw ?? ''}" no reconocido (se espera PROVEEDOR o PLANTA) — fila omitida` })
      continue
    }

    const semana = num(col.semana >= 0 ? row[col.semana] : null) ?? weekNumFromDate(fechaRaw)

    rows.push({
      ncNumber,
      fecha: fechaRaw,
      semana: Math.round(semana),
      producto,
      razon,
      cantidadKg,
      valorProductoOC: col.valorProductoOC >= 0 ? num(row[col.valorProductoOC]) : null,
      valorNcOC: col.valorNcOC >= 0 ? num(row[col.valorNcOC]) : null,
      destino: mapDestino(destinoRaw),
      precioVentaTercero: col.precioVentaTercero >= 0 ? num(row[col.precioVentaTercero]) : null,
      valorVentaNc: col.valorVentaNc >= 0 ? num(row[col.valorVentaNc]) : null,
      costoPlanta: col.costoPlanta >= 0 ? num(row[col.costoPlanta]) : null,
      responsable,
      sif: col.sif >= 0 ? str(row[col.sif]) : null,
      proveedor: col.proveedor >= 0 ? str(row[col.proveedor]) : null,
      oc: col.oc >= 0 ? str(row[col.oc]) : null,
      estadoNc: col.estadoNc >= 0 ? mapEstadoNc(str(row[col.estadoNc])) : null,
      fechaDisposicion: col.fechaDisposicion >= 0 ? excelDate(row[col.fechaDisposicion]) : null,
      camara: col.camara >= 0 ? str(row[col.camara]) : null,
      gestionado: col.reclamoProveedor >= 0 ? mapGestionado(str(row[col.reclamoProveedor])) : false,
    })
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'No se encontraron filas válidas en el archivo (revise los datos faltantes).',
      rows: [], issues, totalRowsInSheet,
    }
  }

  return { ok: true, rows, issues, totalRowsInSheet }
}

/** WEEKNUM estilo Excel (semana empieza domingo) a partir de una fecha ISO, usado
 *  como respaldo si la columna SEMANA del Excel no está presente o viene vacía. */
function weekNumFromDate(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z')
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7)
}

/** Helper para uso en cliente: lee un ArrayBuffer/File y devuelve el workbook parseado. */
export function readWorkbook(data: ArrayBuffer | Uint8Array): XLSX.WorkBook {
  return XLSX.read(data, { type: 'array', cellDates: true })
}
