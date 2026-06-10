import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { parseProyeccion } from '@/lib/saturacion'

export const dynamic = 'force-dynamic'

// POST (multipart) → file, semana, desde, hasta → parsea y guarda (upsert por semana)
export async function POST(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para cargar proyección' }, { status: 403 })
  }
  const form = await req.formData()
  const file = form.get('file') as File | null
  const semana = String(form.get('semana') ?? '')
  const desde = String(form.get('desde') ?? '')
  const hasta = String(form.get('hasta') ?? '')
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  if (!semana || !desde || !hasta) return NextResponse.json({ error: 'Semana y rango requeridos' }, { status: 400 })

  let parsed
  try {
    parsed = parseProyeccion(Buffer.from(await file.arrayBuffer()))
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo (.xlsx)' }, { status: 400 })
  }
  if (parsed.productos.length === 0) {
    return NextResponse.json({ error: 'No se encontraron productos en la hoja PROYECCIÓN' }, { status: 400 })
  }

  const fechaInicio = new Date(`${desde}T00:00:00`)
  const fechaFin = new Date(`${hasta}T00:00:00`)

  const proy = await prisma.proyeccionSemanal.upsert({
    where: { semana },
    create: { semana, fechaInicio, fechaFin },
    update: { fechaInicio, fechaFin },
  })
  await prisma.proyeccionProducto.deleteMany({ where: { proyeccionId: proy.id } })
  await prisma.proyeccionProducto.createMany({
    data: parsed.productos.map((p) => ({
      proyeccionId: proy.id, sku: p.sku, descripcion: p.descripcion, categoria: p.categoria, rendimientoSAP: p.rendimientoSAP,
      pedidoLunes: p.pedidos[0] ?? 0, pedidoMartes: p.pedidos[1] ?? 0, pedidoMiercoles: p.pedidos[2] ?? 0,
      pedidoJueves: p.pedidos[3] ?? 0, pedidoViernes: p.pedidos[4] ?? 0, pedidoSabado: p.pedidos[5] ?? 0,
    })),
  })

  const porCat = parsed.productos.reduce<Record<string, number>>((a, p) => { a[p.categoria] = (a[p.categoria] ?? 0) + 1; return a }, {})
  return NextResponse.json({ ok: true, semana, productos: parsed.productos.length, porCategoria: porCat })
}
