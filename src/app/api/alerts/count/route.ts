import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { generateAlerts, getAlertCounts } from '@/lib/alerts'

/**
 * Conteo de alertas para el badge del sidebar. Regenera y devuelve { critical, total }.
 * Polled cada 30s por el cliente. Accesible para todos los roles autenticados.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await generateAlerts()
  const counts = await getAlertCounts()
  return NextResponse.json(counts)
}
