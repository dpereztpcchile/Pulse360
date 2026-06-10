import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'
import { lineaDeProducto } from '@/lib/capacidad/lineas'
import { getCapacidadSemanal } from '@/lib/capacidad'

export const dynamic = 'force-dynamic'

// código de producto → nombre de línea en BD
const CODE_TO_NOMBRE: Record<string, string> = { CARNICERIA: 'Carnicería', MOLIENDA: 'Molienda' }

// GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD → matriz capacidad (BD) + demanda real
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  if (!desde || !hasta) return NextResponse.json({ error: 'Rango requerido (desde, hasta)' }, { status: 400 })

  // 7 días del rango
  const dias: string[] = []
  for (let d = new Date(`${desde}T00:00:00`); d <= new Date(`${hasta}T00:00:00`); d.setDate(d.getDate() + 1)) {
    dias.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  // Capacidad calculada desde BD
  const matriz = await getCapacidadSemanal(dias)

  // ── Demanda real ──
  const demanda: Record<string, Record<string, number>> = {}

  // Resto de líneas: OF (producto terminado), salvo Carnicería (que se mide en MP)
  const ofs = await prisma.ordenFabricacion.findMany({
    where: { fecha: { gte: new Date(`${desde}T00:00:00.000Z`), lte: new Date(`${hasta}T23:59:59.999Z`) } },
    select: { producto: true, cantidadPlanificada: true, fecha: true },
  })
  for (const o of ofs) {
    const code = lineaDeProducto(o.producto)
    if (code === 'CARNICERIA') continue
    const nombre = CODE_TO_NOMBRE[code] ?? code
    const ymd = o.fecha.toISOString().slice(0, 10)
    demanda[nombre] ??= {}
    demanda[nombre][ymd] = (demanda[nombre][ymd] ?? 0) + o.cantidadPlanificada
  }

  // Carnicería: demanda en MATERIA PRIMA (kgMPTeorico del programa)
  const programas = await prisma.programaCarniceria.findMany({
    where: { fecha: { gte: new Date(`${desde}T00:00:00`), lte: new Date(`${hasta}T23:59:59.999`) } },
    include: { cortes: { select: { kgMPTeorico: true } } },
  })
  for (const p of programas) {
    const ymd = p.fecha.toISOString().slice(0, 10)
    const mp = p.cortes.reduce((a, c) => a + c.kgMPTeorico, 0)
    if (mp <= 0) continue
    demanda['Carnicería'] ??= {}
    demanda['Carnicería'][ymd] = (demanda['Carnicería'][ymd] ?? 0) + mp
  }

  return NextResponse.json({ periodo: { desde, hasta }, matriz, demanda })
}
