import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { cerrarDiaCarniceria } from '@/lib/control-turno/cierre-carniceria'

// POST → guarda el cierre diario de Carnicería (Kg MP real) para reportes.
// Autorizado por header x-cron-secret === CRON_SECRET, o por sesión de Administrador.
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  const bySecret = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET
  if (!bySecret && !(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const cierre = await cerrarDiaCarniceria(searchParams.get('fecha'))
  return NextResponse.json({ ok: true, cierre })
}
