import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { dayBounds } from '@/lib/control-turno/service'

const MOLIENDA_CODE = 'MOLIENDA'
const CARNICERIA_CODE = 'CARNICERIA'

// GET ?fecha=YYYY-MM-DD → detalle del programa de esa fecha (Carnicería + Molienda)
//     sin fecha → historial de cargas
export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get('fecha')

  if (!fecha) {
    const cargas = await prisma.cargaPrograma.findMany({ orderBy: { fecha: 'desc' } })
    return NextResponse.json(cargas)
  }

  const { start, end } = dayBounds(fecha)
  const [carniceria, molienda, aggregate] = await Promise.all([
    prisma.programaCarniceria.findFirst({
      where: { fecha: { gte: start, lte: end } },
      include: { cortes: { orderBy: { orden: 'asc' } } },
    }),
    prisma.programaDiario.findFirst({
      where: { fecha: { gte: start, lte: end }, linea: { code: MOLIENDA_CODE } },
      include: { registros: { include: { batches: { orderBy: { numeroBatch: 'asc' } } } } },
    }),
    prisma.cargaPrograma.findFirst({ where: { fecha: { gte: start, lte: end } } }),
  ])
  return NextResponse.json({ aggregate, carniceria, molienda })
}

// POST → carga transaccional (todo o nada). Body: { fecha, archivoNombre, archivoTamanio, replace, carniceria[], molienda[] }
export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const { fecha, archivoNombre, archivoTamanio, replace } = body
  const carniceria = Array.isArray(body.carniceria) ? body.carniceria : []
  const molienda = Array.isArray(body.molienda) ? body.molienda : []
  if (carniceria.length === 0 && molienda.length === 0) {
    return NextResponse.json({ error: 'El programa no contiene datos válidos.' }, { status: 400 })
  }

  const { start, end, day } = dayBounds(fecha)

  // Control de duplicados
  const existing = await prisma.cargaPrograma.findFirst({ where: { fecha: { gte: start, lte: end } } })
  if (existing && !replace) {
    return NextResponse.json({
      exists: true,
      info: { fecha: existing.fecha, cargadoPor: existing.cargadoPor, cargadoEn: existing.cargadoEn },
    }, { status: 409 })
  }

  // Líneas y catálogo (lecturas previas al $transaction)
  const [carnLine, molLine, catalogo] = await Promise.all([
    prisma.productionLine.findUnique({ where: { code: CARNICERIA_CODE }, select: { id: true } }),
    prisma.productionLine.findUnique({ where: { code: MOLIENDA_CODE }, select: { id: true } }),
    prisma.catalogoCortesCarniceria.findMany({ select: { sku: true, productividadObjetivo: true, rendimientoTeorico: true } }),
  ])
  if (!carnLine || !molLine) {
    return NextResponse.json({ error: 'No se encontraron las líneas Carnicería/Molienda.' }, { status: 500 })
  }
  const bySku = Object.fromEntries(catalogo.map((c) => [c.sku, c]))

  // Totales
  const totalKgMP = Math.round(carniceria.reduce((a: number, c: { kgMPTeorico?: number }) => a + (Number(c.kgMPTeorico) || 0), 0))
  const totalBatches = molienda.reduce((a: number, m: { numBatches?: number }) => a + (Number(m.numBatches) || 0), 0)

  // Construcción de operaciones atómicas
  const ops = []
  if (existing && replace) {
    ops.push(prisma.cargaPrograma.deleteMany({ where: { fecha: { gte: start, lte: end } } }))
    ops.push(prisma.programaCarniceria.deleteMany({ where: { fecha: { gte: start, lte: end } } }))
    ops.push(prisma.programaDiario.deleteMany({ where: { lineaId: molLine.id, fecha: { gte: start, lte: end } } }))
  }

  // Carnicería → ProgramaCarniceria
  if (carniceria.length > 0) {
    ops.push(prisma.programaCarniceria.create({
      data: {
        fecha: day, turno: 'MANANA', dotacion: 0, archivoNombre: archivoNombre || 'programa.xlsx', creadoPor: session.user?.name ?? 'Administrador',
        cortes: {
          create: carniceria.map((c: Record<string, unknown>, i: number) => {
            const sku = c.sku ? String(c.sku) : ''
            const ref = bySku[sku]
            const rend = Number(c.rendTeorico) || ref?.rendimientoTeorico || 0
            return {
              sku: sku || null,
              nombre: String(c.nombre ?? 'Corte'),
              orden: i + 1,
              kgPTPlan: Number(c.kgPTPlan) || 0,
              kgMPTeorico: Number(c.kgMPTeorico) || 0,
              rendTeorico: rend,
              prodObjetivo: ref?.productividadObjetivo ?? 60,
              hiTeorico: c.hiTeorico ? String(c.hiTeorico) : null,
              htTeorico: c.htTeorico ? String(c.htTeorico) : null,
              estado: 'PENDIENTE' as const,
            }
          }),
        },
      },
    }))
  }

  // Molienda → ProgramaDiario (genérico) + RegistroProduccion + RegistroBatch
  if (molienda.length > 0) {
    ops.push(prisma.programaDiario.create({
      data: {
        fecha: day, lineaId: molLine.id, turno: 'MANANA', archivoNombre: archivoNombre || 'programa.xlsx', creadoPor: session.user?.name ?? 'Administrador',
        registros: {
          create: molienda.map((m: Record<string, unknown>) => {
            const numBatches = Math.max(0, Math.round(Number(m.numBatches) || 0))
            const kgBatch = Number(m.kgBatch) || 0
            const kgPlan = Number(m.kgTotal) || numBatches * kgBatch
            return {
              lineaId: molLine.id,
              productoNombre: String(m.productoNombre ?? 'Producto'),
              turno: 'MANANA' as const,
              fecha: day,
              kgPlan,
              estado: 'PENDIENTE' as const,
              batches: numBatches > 0 ? {
                create: Array.from({ length: numBatches }, (_, i) => ({ numeroBatch: i + 1, kgBatch, estado: 'PENDIENTE' as const })),
              } : undefined,
            }
          }),
        },
      },
    }))
  }

  // Agregador
  ops.push(prisma.cargaPrograma.create({
    data: {
      fecha: day,
      archivoNombre: archivoNombre || 'programa.xlsx',
      archivoTamanio: Math.max(0, Math.round(Number(archivoTamanio) || 0)),
      archivoData: typeof body.archivoData === 'string' && body.archivoData ? body.archivoData : null,
      cargadoPor: session.user?.name ?? 'Administrador',
      estado: 'ACTIVO',
      totalCortesCarniceria: carniceria.length,
      totalKgMPCarniceria: totalKgMP,
      totalProductosMolienda: molienda.length,
      totalBatchesMolienda: totalBatches,
    },
  }))

  try {
    await prisma.$transaction(ops)
  } catch {
    return NextResponse.json({ error: 'Error al guardar el programa. No se cargó ningún dato (rollback).' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    resumen: {
      fecha: day.toISOString().slice(0, 10),
      cortesCarniceria: carniceria.length,
      kgMPCarniceria: totalKgMP,
      productosMolienda: molienda.length,
      batchesMolienda: totalBatches,
    },
  }, { status: 201 })
}
