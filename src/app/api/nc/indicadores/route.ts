import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getIndicadoresProveedor, getIndicadoresPlanta } from '@/lib/nc/indicadores'

/**
 * GET /api/nc/indicadores?grupo=PROVEEDOR|PLANTA&semanaDesde=&semanaHasta=&excluirEnvase=1
 * Devuelve las agregaciones del grupo solicitado. Las NC "gestionadas" se
 * excluyen siempre (regla fija, no configurable).
 */
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const grupo = searchParams.get('grupo') === 'PLANTA' ? 'PLANTA' : 'PROVEEDOR'
  const semanaDesde = searchParams.get('semanaDesde') ? Number(searchParams.get('semanaDesde')) : undefined
  const semanaHasta = searchParams.get('semanaHasta') ? Number(searchParams.get('semanaHasta')) : undefined
  const excluirEnvase = searchParams.get('excluirEnvase') === '1' || searchParams.get('excluirEnvase') === 'true'

  const filtros = { semanaDesde, semanaHasta, excluirEnvase }

  if (grupo === 'PLANTA') {
    const data = await getIndicadoresPlanta(filtros)
    return NextResponse.json({ grupo, ...data })
  }
  const data = await getIndicadoresProveedor(filtros)
  return NextResponse.json({ grupo, ...data })
}
