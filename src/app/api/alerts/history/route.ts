import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getAlertHistory } from '@/lib/alerts'

/**
 * Historial de alertas resueltas + KPIs del mes.
 * Filtros: ?from=YYYY-MM-DD &to=YYYY-MM-DD &module= &severity=
 * Accesible para todos los roles autenticados.
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const moduleParam = searchParams.get('module') ?? undefined
  const severity = searchParams.get('severity') ?? undefined

  let from: Date | undefined
  let to: Date | undefined
  if (fromStr) { from = new Date(fromStr); from.setHours(0, 0, 0, 0) }
  if (toStr) { to = new Date(toStr); to.setHours(23, 59, 59, 999) }

  const result = await getAlertHistory({
    from, to,
    module: moduleParam || undefined,
    severity: severity || undefined,
  })

  return NextResponse.json(result)
}
