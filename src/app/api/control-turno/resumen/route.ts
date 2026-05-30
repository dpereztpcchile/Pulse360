import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getResumen } from '@/lib/control-turno/service'

// GET ?fecha=&turno=  → resumen de turno por línea
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const resumen = await getResumen(searchParams.get('fecha'), searchParams.get('turno') ?? 'MANANA')
  return NextResponse.json(resumen)
}
