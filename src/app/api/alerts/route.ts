import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { generateAlerts, getActiveAlerts } from '@/lib/alerts'

/**
 * Lista las alertas activas (regenera primero para reflejar el estado actual).
 * Accesible para todos los roles autenticados.
 * Filtros: ?filter=all|critical|unacknowledged  &  ?module=PRODUCCION|...
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await generateAlerts()

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all'
  const moduleParam = searchParams.get('module') ?? undefined

  const result = await getActiveAlerts({
    module: moduleParam || undefined,
    onlyCritical: filter === 'critical',
    onlyUnacknowledged: filter === 'unacknowledged',
  })

  return NextResponse.json(result)
}
