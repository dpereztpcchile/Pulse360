import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { parseNcWorkbook, type NcRowParsed } from '@/lib/nc/parse'

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

/**
 * Importación masiva de NC desde "SEGUIMIENTO NC.xlsx".
 *
 * Semántica de carga semanal (confirmada por el usuario): el archivo subido
 * siempre contiene el histórico completo + las NC nuevas de la semana. NUNCA
 * se actualizan filas existentes — solo se insertan filas cuyo ncNumber no
 * exista todavía en la base de datos. Esto garantiza que los datos
 * históricos no cambien, solo se agreguen NC nuevas.
 *
 * Body esperado: multipart/form-data con campo "file" (el .xlsx).
 * Acceso: ADMINISTRADOR o SUPERVISOR (misma política que otras cargas de archivo).
 */
export async function POST(req: Request) {
  const session = await requireRole(['ADMINISTRADOR', 'SUPERVISOR'])
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 15 MB' }, { status: 400 })
  }

  let wb: XLSX.WorkBook
  try {
    const buf = await file.arrayBuffer()
    wb = XLSX.read(buf, { type: 'array', cellDates: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) válido.' }, { status: 400 })
  }

  const parsed = parseNcWorkbook(wb)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error ?? 'No se pudo procesar el archivo' }, { status: 400 })
  }

  // Dedup por ncNumber: solo se insertan los que no existen todavía.
  const ncNumbers = parsed.rows.map((r) => r.ncNumber)
  const existing = await prisma.ncRegistro.findMany({
    where: { ncNumber: { in: ncNumbers } },
    select: { ncNumber: true },
  })
  const existingSet = new Set(existing.map((e) => e.ncNumber))

  const toInsert: NcRowParsed[] = []
  const seenInFile = new Set<number>()
  let duplicatesInFile = 0
  for (const row of parsed.rows) {
    if (seenInFile.has(row.ncNumber)) { duplicatesInFile++; continue } // mismo ncNumber repetido dentro del propio archivo
    seenInFile.add(row.ncNumber)
    if (existingSet.has(row.ncNumber)) continue // ya existe en la base → se omite (no se actualiza)
    toInsert.push(row)
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      inserted: 0,
      skippedExisting: ncNumbers.length - toInsert.length - duplicatesInFile,
      duplicatesInFile,
      issues: parsed.issues,
      totalRowsInSheet: parsed.totalRowsInSheet,
      message: 'No hay NC nuevas para importar: todos los N° de NC del archivo ya existen en la base de datos.',
    })
  }

  await prisma.ncRegistro.createMany({
    data: toInsert.map((r) => ({
      ncNumber: r.ncNumber,
      fecha: new Date(r.fecha),
      semana: r.semana,
      producto: r.producto,
      razon: r.razon,
      cantidadKg: r.cantidadKg,
      valorProductoOC: r.valorProductoOC,
      valorNcOC: r.valorNcOC,
      destino: r.destino,
      precioVentaTercero: r.precioVentaTercero,
      valorVentaNc: r.valorVentaNc,
      costoPlanta: r.costoPlanta,
      responsable: r.responsable!,
      sif: r.sif,
      proveedor: r.proveedor,
      oc: r.oc,
      estadoNc: r.estadoNc,
      fechaDisposicion: r.fechaDisposicion ? new Date(r.fechaDisposicion) : null,
      camara: r.camara,
      gestionado: r.gestionado,
    })),
  })

  return NextResponse.json({
    inserted: toInsert.length,
    skippedExisting: ncNumbers.length - toInsert.length - duplicatesInFile,
    duplicatesInFile,
    issues: parsed.issues,
    totalRowsInSheet: parsed.totalRowsInSheet,
    message: `Se importaron ${toInsert.length} NC nuevas.`,
  }, { status: 201 })
}

/**
 * Vista previa (dry-run): parsea el archivo y devuelve cuántas filas son
 * nuevas vs. ya existentes, sin escribir en la base de datos. Se usa en la
 * pestaña "Carga de archivos" antes de confirmar el import.
 */
export async function PUT(req: Request) {
  const session = await requireRole(['ADMINISTRADOR', 'SUPERVISOR'])
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 15 MB' }, { status: 400 })
  }

  let wb: XLSX.WorkBook
  try {
    const buf = await file.arrayBuffer()
    wb = XLSX.read(buf, { type: 'array', cellDates: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) válido.' }, { status: 400 })
  }

  const parsed = parseNcWorkbook(wb)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error ?? 'No se pudo procesar el archivo' }, { status: 400 })
  }

  const ncNumbers = parsed.rows.map((r) => r.ncNumber)
  const existing = await prisma.ncRegistro.findMany({
    where: { ncNumber: { in: ncNumbers } },
    select: { ncNumber: true },
  })
  const existingSet = new Set(existing.map((e) => e.ncNumber))

  const seenInFile = new Set<number>()
  let nuevas = 0
  let existentes = 0
  let duplicatesInFile = 0
  for (const row of parsed.rows) {
    if (seenInFile.has(row.ncNumber)) { duplicatesInFile++; continue }
    seenInFile.add(row.ncNumber)
    if (existingSet.has(row.ncNumber)) existentes++
    else nuevas++
  }

  return NextResponse.json({
    totalRowsInSheet: parsed.totalRowsInSheet,
    totalFilasValidas: parsed.rows.length,
    nuevas,
    existentes,
    duplicatesInFile,
    issues: parsed.issues,
  })
}
