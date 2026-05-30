import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getHistorico } from '@/lib/capacidad/service'

// GET ?periodo=2sem|mes|3meses&estado=todos|estres|advertencia
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const data = await getHistorico(searchParams.get('periodo') ?? '2sem', searchParams.get('estado') ?? 'todos')
  return NextResponse.json(data)
}
