import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'
import { dayBounds } from '@/lib/control-turno/service'
import { getTurnoLine } from '@/lib/control-turno/config'

const VALID_SHIFTS = ['MANANA', 'TARDE', 'NOCHE']

// GET ?fecha=YYYY-MM-DD&turno=MANANA  → programas + registros (+batches) de la fecha
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const { start, end } = dayBounds(searchParams.get('fecha'))
  const turno = searchParams.get('turno') ?? 'MANANA'

  const programas = await prisma.programaDiario.findMany({
    where: { fecha: { gte: start, lte: end }, turno: turno as never },
    include: {
      linea: { select: { id: true, name: true, code: true } },
      registros: { include: { batches: { orderBy: { numeroBatch: 'asc' } } }, orderBy: { createdAt: 'asc' } },
    },
  })

  return NextResponse.json(programas)
}

// POST  → carga el programa del día. Crea un ProgramaDiario por línea con sus registros.
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para cargar el programa' }, { status: 403 })
  }

  const body = await req.json()
  const { fecha, turno = 'MANANA', archivoNombre, creadoPor, replace, lineas } = body

  if (!VALID_SHIFTS.includes(turno)) {
    return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })
  }
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return NextResponse.json({ error: 'El programa no contiene líneas válidas' }, { status: 400 })
  }

  const { start, end, day } = dayBounds(fecha)

  // ¿Ya existe un programa para ese día/turno?
  const existing = await prisma.programaDiario.count({
    where: { fecha: { gte: start, lte: end }, turno: turno as never },
  })
  if (existing > 0 && !replace) {
    return NextResponse.json({ exists: true, message: 'Ya existe un programa cargado para este día' }, { status: 409 })
  }
  if (existing > 0 && replace) {
    await prisma.programaDiario.deleteMany({ where: { fecha: { gte: start, lte: end }, turno: turno as never } })
  }

  // Resolver líneas por código
  const codes: string[] = lineas.map((l: { code: string }) => l.code)
  const dbLines = await prisma.productionLine.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } })
  const idByCode = Object.fromEntries(dbLines.map((l) => [l.code, l.id]))

  let totalRegistros = 0
  for (const linea of lineas) {
    const lineId = idByCode[linea.code]
    const cat = getTurnoLine(linea.code)
    if (!lineId || !cat || !Array.isArray(linea.registros)) continue

    const registros = linea.registros.map((r: Record<string, unknown>) => {
      const numBatches = Number(r.numBatches) || 0
      const kgBatch = Number(r.kgBatch) || 0
      const base = {
        lineaId: lineId,
        sku: (r.sku as string) || null,
        productoNombre: String(r.productoNombre ?? 'Producto'),
        turno: turno as never,
        fecha: day,
        kgPlan: Number(r.kgPlan) || (cat.variant === 'MOLIENDA' ? numBatches * kgBatch : 0),
        rendTeoricoPorc: r.rendTeoricoPorc != null ? Number(r.rendTeoricoPorc) : null,
        pesoUnitarioKg: r.pesoUnitarioKg != null ? Number(r.pesoUnitarioKg) : null,
        estado: 'PENDIENTE' as const,
      }
      if (cat.variant === 'MOLIENDA' && numBatches > 0) {
        return {
          ...base,
          batches: {
            create: Array.from({ length: numBatches }, (_, i) => ({
              numeroBatch: i + 1,
              kgBatch,
              estado: 'PENDIENTE' as const,
            })),
          },
        }
      }
      return base
    })

    await prisma.programaDiario.create({
      data: {
        fecha: day,
        lineaId: lineId,
        turno: turno as never,
        archivoNombre: archivoNombre || 'programa.xlsx',
        creadoPor: creadoPor || 'Sistema',
        registros: { create: registros },
      },
    })
    totalRegistros += registros.length
  }

  return NextResponse.json({ ok: true, lineas: lineas.length, registros: totalRegistros }, { status: 201 })
}

// DELETE ?fecha=&turno=  → elimina el programa del día (cascada a registros/batches)
export async function DELETE(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const { start, end } = dayBounds(searchParams.get('fecha'))
  const turno = searchParams.get('turno') ?? 'MANANA'
  await prisma.programaDiario.deleteMany({ where: { fecha: { gte: start, lte: end }, turno: turno as never } })
  return NextResponse.json({ ok: true })
}
