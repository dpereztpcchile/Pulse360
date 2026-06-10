import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getSaturacion } from '@/lib/saturacion'

export const dynamic = 'force-dynamic'

// GET ?semana=2026-W24 → datos calculados de los 3 ítems de saturación
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const semana = new URL(req.url).searchParams.get('semana')
  if (!semana) return NextResponse.json({ error: 'semana requerida' }, { status: 400 })
  const data = await getSaturacion(semana)
  return NextResponse.json({ semana, data })
}
