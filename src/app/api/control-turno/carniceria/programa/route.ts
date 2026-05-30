import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'
import { dayBounds } from '@/lib/control-turno/service'
import { kgMPTeorico } from '@/lib/control-turno/carniceria'

const VALID_SHIFTS = ['MANANA', 'TARDE', 'NOCHE']

// GET ?fecha=&turno=  → programa Carnicería del día + cortes
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const { start, end } = dayBounds(searchParams.get('fecha'))
  const turno = searchParams.get('turno') ?? 'MANANA'

  const programa = await prisma.programaCarniceria.findFirst({
    where: { fecha: { gte: start, lte: end }, turno: turno as never },
    include: { cortes: { orderBy: { orden: 'asc' } } },
  })
  return NextResponse.json(programa)
}

// POST  → carga el programa Carnicería (con dotación). Pre-puebla los cortes.
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para cargar el programa' }, { status: 403 })
  }
  const body = await req.json()
  const { fecha, turno = 'MANANA', dotacion, archivoNombre, creadoPor, replace, cortes } = body

  if (!VALID_SHIFTS.includes(turno)) return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })
  if (!Array.isArray(cortes) || cortes.length === 0) {
    return NextResponse.json({ error: 'El programa no contiene cortes válidos' }, { status: 400 })
  }

  const { start, end, day } = dayBounds(fecha)
  const existing = await prisma.programaCarniceria.findFirst({ where: { fecha: { gte: start, lte: end }, turno: turno as never } })
  if (existing && !replace) {
    return NextResponse.json({ exists: true, message: 'Ya existe un programa cargado para este día' }, { status: 409 })
  }
  if (existing && replace) {
    await prisma.programaCarniceria.delete({ where: { id: existing.id } })
  }

  // Catálogo para enriquecer rendimiento/objetivo si faltan en el Excel
  const catalogo = await prisma.catalogoCortesCarniceria.findMany()
  const bySku = Object.fromEntries(catalogo.map((c) => [c.sku, c]))

  const programa = await prisma.programaCarniceria.create({
    data: {
      fecha: day,
      turno: turno as never,
      dotacion: Number(dotacion) || 0,
      archivoNombre: archivoNombre || 'programa.xlsx',
      creadoPor: creadoPor || 'Sistema',
      cortes: {
        create: cortes.map((c: Record<string, unknown>, i: number) => {
          const sku = String(c.sku ?? '')
          const ref = bySku[sku]
          const rendTeorico = Number(c.rendTeorico) || ref?.rendimientoTeorico || 0
          const prodObjetivo = Number(c.prodObjetivo) || ref?.productividadObjetivo || 0
          const kgPTPlan = Number(c.kgPTPlan) || 0
          return {
            sku,
            nombre: String(c.nombre ?? ref?.nombre ?? 'Corte'),
            orden: Number(c.orden) || i + 1,
            kgPTPlan,
            kgMPTeorico: Math.round(kgMPTeorico(kgPTPlan, rendTeorico) * 10) / 10,
            rendTeorico,
            prodObjetivo,
            hiTeorico: c.hiTeorico != null ? String(c.hiTeorico) : null,
            htTeorico: c.htTeorico != null ? String(c.htTeorico) : null,
            estado: 'PENDIENTE' as const,
          }
        }),
      },
    },
    include: { cortes: { orderBy: { orden: 'asc' } } },
  })

  return NextResponse.json(programa, { status: 201 })
}

// PATCH  → actualizar dotación durante el turno (recalcula derivados de cortes completados)
export async function PATCH(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const body = await req.json()
  const { programaId, dotacion } = body
  if (!programaId || dotacion == null) return NextResponse.json({ error: 'programaId y dotación requeridos' }, { status: 400 })

  const dot = Math.max(0, Number(dotacion))
  const programa = await prisma.programaCarniceria.update({ where: { id: programaId }, data: { dotacion: dot } })

  // Recalcular derivados de cortes ya con horas/kg
  const { computeDerivados } = await import('@/lib/control-turno/carniceria')
  const cortes = await prisma.registroCorteCarniceria.findMany({ where: { programaId } })
  for (const c of cortes) {
    if (c.horaInicio && c.horaTermino) {
      const d = computeDerivados({ horaInicio: c.horaInicio, horaTermino: c.horaTermino, kgMPReal: c.kgMPReal, kgPTReal: c.kgPTReal, dotacion: dot })
      await prisma.registroCorteCarniceria.update({ where: { id: c.id }, data: d })
    }
  }

  const refreshed = await prisma.programaCarniceria.findUnique({ where: { id: programaId }, include: { cortes: { orderBy: { orden: 'asc' } } } })
  return NextResponse.json(refreshed ?? programa)
}

// DELETE ?fecha=&turno=
export async function DELETE(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const { start, end } = dayBounds(searchParams.get('fecha'))
  const turno = searchParams.get('turno') ?? 'MANANA'
  await prisma.programaCarniceria.deleteMany({ where: { fecha: { gte: start, lte: end }, turno: turno as never } })
  return NextResponse.json({ ok: true })
}
