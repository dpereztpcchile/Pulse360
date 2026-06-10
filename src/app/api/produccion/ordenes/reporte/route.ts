import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const ORDER = ['BISTEC', 'ESCALOPA', 'MOLIDAS', 'CUBOS', 'OTROS']

/** Categoría del producto según su nombre. */
function categoria(producto: string): string {
  const p = (producto || '').toUpperCase()
  if (p.includes('BISTEC')) return 'BISTEC'
  if (p.includes('ESCALOPA')) return 'ESCALOPA'
  if (p.includes('MOLIDA')) return 'MOLIDAS'
  if (p.includes('CUBO')) return 'CUBOS'
  return 'OTROS'
}

const r1 = (n: number) => Math.round(n * 10) / 10

// GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD → reporte de quiebre acumulado del rango
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  if (!desde || !hasta) return NextResponse.json({ error: 'Rango de fechas requerido (desde, hasta)' }, { status: 400 })

  // Las OF se almacenan a medianoche UTC (conversión de fecha SAP). Usamos límites UTC
  // para que el rango capture correctamente los días seleccionados.
  const start = new Date(`${desde}T00:00:00.000Z`)
  const end = new Date(`${hasta}T23:59:59.999Z`)

  const ofs = await prisma.ordenFabricacion.findMany({
    where: { fecha: { gte: start, lte: end } },
    orderBy: { numeroOF: 'asc' },
  })

  const kgPedido = ofs.reduce((a, o) => a + o.cantidadPlanificada, 0)
  const kgCompletado = ofs.reduce((a, o) => a + o.cantidadCompletada, 0)
  const kgQuiebre = kgPedido - kgCompletado
  const nivelServicio = kgPedido > 0 ? (kgCompletado / kgPedido) * 100 : 0

  // ── Agrupación por categoría ──
  const map = new Map<string, { pedido: number; completado: number; razones: Map<string, number> }>()
  for (const o of ofs) {
    const cat = categoria(o.producto)
    const g = map.get(cat) ?? { pedido: 0, completado: 0, razones: new Map<string, number>() }
    g.pedido += o.cantidadPlanificada
    g.completado += o.cantidadCompletada
    const cumpl = o.cantidadPlanificada > 0 ? (o.cantidadCompletada / o.cantidadPlanificada) * 100 : 0
    if (cumpl < 95 && o.razonQuiebre) g.razones.set(o.razonQuiebre, (g.razones.get(o.razonQuiebre) ?? 0) + 1)
    map.set(cat, g)
  }

  const grupos = Array.from(map.entries())
    .map(([nombre, g]) => {
      const nivelServicio = g.pedido > 0 ? (g.completado / g.pedido) * 100 : 0
      // Los grupos con cumplimiento >= 95% no se justifican (no requieren razón de quiebre)
      let razonFrecuente: string | null = null
      if (nivelServicio < 95) {
        let max = 0
        for (const [razon, n] of Array.from(g.razones)) if (n > max) { max = n; razonFrecuente = razon }
      }
      return {
        nombre,
        kgPedido: r1(g.pedido),
        kgCompletado: r1(g.completado),
        nivelServicio: r1(nivelServicio),
        quiebreKg: r1(g.pedido - g.completado),
        razonFrecuente,
      }
    })
    .sort((a, b) => ORDER.indexOf(a.nombre) - ORDER.indexOf(b.nombre))

  const ofsConQuiebre = ofs
    .map((o) => ({
      numeroOF: o.numeroOF,
      producto: o.producto,
      cantidadPlanificada: r1(o.cantidadPlanificada),
      cantidadCompletada: r1(o.cantidadCompletada),
      cumplimiento: r1(o.cantidadPlanificada > 0 ? (o.cantidadCompletada / o.cantidadPlanificada) * 100 : 0),
      razonQuiebre: o.razonQuiebre,
    }))
    .filter((o) => o.cumplimiento < 95)
    .sort((a, b) => a.cumplimiento - b.cumplimiento)

  return NextResponse.json({
    periodo: { desde, hasta },
    totalOF: ofs.length,
    kgPedido: r1(kgPedido),
    kgCompletado: r1(kgCompletado),
    kgQuiebre: r1(kgQuiebre),
    nivelServicio: r1(nivelServicio),
    grupos,
    ofsConQuiebre,
  })
}
