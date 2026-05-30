import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { getDispatchReport } from '@/lib/reports'
import { parseRange } from '../_range'

export const dynamic = 'force-dynamic'

/** Reporte de Despacho. Admin, Supervisor y Operador pueden verlo. */
export async function GET(req: Request) {
  const session = await requireRole(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const { from, to } = parseRange(searchParams)

  const report = await getDispatchReport({ from, to })
  return NextResponse.json(report)
}
