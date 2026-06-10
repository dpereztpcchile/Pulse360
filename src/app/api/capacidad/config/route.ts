import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getLineasConfig } from '@/lib/capacidad'

export const dynamic = 'force-dynamic'

// GET → todas las líneas con turnos, horarios y productividad
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ lineas: await getLineasConfig() })
}
