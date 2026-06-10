import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getCapacidadLinea } from '@/lib/capacidad'

export const dynamic = 'force-dynamic'

// GET ?lineaId=X&dia=1 → capacidad calculada (kg) para ese día
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const lineaId = searchParams.get('lineaId')
  const dia = Number(searchParams.get('dia'))
  if (!lineaId || !dia || dia < 1 || dia > 7) return NextResponse.json({ error: 'lineaId y dia (1-7) requeridos' }, { status: 400 })
  const capacidad = await getCapacidadLinea(lineaId, dia)
  return NextResponse.json({ lineaId, dia, capacidad })
}
