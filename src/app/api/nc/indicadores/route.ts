import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { getIndicadoresProveedor, getIndicadoresPlanta } from '@/lib/nc/indicadores'

/**
 * GET /api/nc/indicadores?grupo=PROVEEDOR|PLANTA&semanas=36,37,38&meses=2026-09,2026-10&excluirEnvase=1
 * Devuelve las agregaciones del grupo solicitado. Las NC "gestionadas" se
 * excluyen siempre de los indicadores económicos (regla fija, no configurable);
 * el único indicador que sí las contempla es el donut "Gestionado".
 *
 * `semanas` y `meses` son listas separadas por coma para los segmentadores
 * multi-selección (si vienen vacíos, no se filtra por ese criterio).
 * Se mantiene compatibilidad con semanaDesde/semanaHasta (rango simple) por
 * si algún consumidor anterior los sigue usando.
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

  const semanasParam = searchParams.get('semanas')
  const semanas = semanasParam
    ? semanasParam.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
    : undefined

  const mesesParam = searchParams.get('meses')
  const meses = mesesParam ? mesesParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined

  const filtros = { semanaDesde, semanaHasta, semanas, meses, excluirEnvase }

  if (grupo === 'PLANTA') {
    const data = await getIndicadoresPlanta(filtros)
    return NextResponse.json({ grupo, ...data })
  }
  const data = await getIndicadoresProveedor(filtros)
  return NextResponse.json({ grupo, ...data })
}
