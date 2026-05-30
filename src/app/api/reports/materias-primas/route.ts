import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { getMaterialsReport } from '@/lib/reports'
import { parseRange } from '../_range'

export const dynamic = 'force-dynamic'

/** Reporte de Materias Primas. Solo Admin y Supervisor. */
export async function GET(req: Request) {
  const session = await requireRole(['ADMINISTRADOR', 'SUPERVISOR'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const { from, to } = parseRange(searchParams)

  const report = await getMaterialsReport({ from, to })
  return NextResponse.json(report)
}
