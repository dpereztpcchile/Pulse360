import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

const VALID_RESPONSABLE = ['PROVEEDOR', 'PLANTA']
const VALID_DESTINO = ['VENTA_A_TERCEROS', 'DECOMISO', 'DEVOLUCION', 'RETENIDO', 'OTRO']
const VALID_ESTADO = ['VENDIDO', 'TRANSFERIDA', 'D_CHILEMINK', 'STANBY']

/**
 * GET /api/nc — listado de NC (modelo NcRegistro, cargado vía import de Excel).
 * No existe creación manual: todos los registros provienen de la pestaña
 * "Carga de archivos" (ver /api/nc/import).
 *
 * Filtros soportados: responsable, destino, estadoNc, proveedor, razon,
 * gestionado, semanaDesde/semanaHasta, ncNumber (búsqueda exacta).
 */
export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const responsable = searchParams.get('responsable')
  const destino = searchParams.get('destino')
  const estadoNc = searchParams.get('estadoNc')
  const proveedor = searchParams.get('proveedor')
  const razon = searchParams.get('razon')
  const gestionado = searchParams.get('gestionado')
  const semanaDesde = searchParams.get('semanaDesde')
  const semanaHasta = searchParams.get('semanaHasta')
  const ncNumber = searchParams.get('ncNumber')

  const where: Record<string, unknown> = {}
  if (responsable && VALID_RESPONSABLE.includes(responsable)) where.responsable = responsable
  if (destino && VALID_DESTINO.includes(destino)) where.destino = destino
  if (estadoNc && VALID_ESTADO.includes(estadoNc)) where.estadoNc = estadoNc
  if (proveedor) where.proveedor = { contains: proveedor, mode: 'insensitive' }
  if (razon) where.razon = { contains: razon, mode: 'insensitive' }
  if (gestionado === 'true' || gestionado === 'false') where.gestionado = gestionado === 'true'
  if (ncNumber) where.ncNumber = Number(ncNumber)
  if (semanaDesde || semanaHasta) {
    where.semana = {
      ...(semanaDesde ? { gte: Number(semanaDesde) } : {}),
      ...(semanaHasta ? { lte: Number(semanaHasta) } : {}),
    }
  }

  const ncs = await prisma.ncRegistro.findMany({ where, orderBy: { ncNumber: 'desc' } })
  return NextResponse.json(ncs)
}
