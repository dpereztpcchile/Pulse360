import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

// PATCH → actualiza cantidad completada y/o razón de quiebre de una OF
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.cantidadCompletada !== undefined) {
    data.cantidadCompletada = body.cantidadCompletada === '' || body.cantidadCompletada === null ? 0 : Math.max(0, Number(body.cantidadCompletada))
  }
  if (body.razonQuiebre !== undefined) {
    data.razonQuiebre = body.razonQuiebre ? String(body.razonQuiebre) : null
  }

  const updated = await prisma.ordenFabricacion.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}
