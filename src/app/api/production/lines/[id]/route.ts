import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'

const VALID_STATUS = ['OPERANDO', 'EN_OBSERVACION', 'DETENIDO']

// Actualizar estado de línea: permitido a los tres roles (operador puede cambiar estado)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR']))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  if (!VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  await prisma.productionLine.update({
    where: { id: params.id },
    data: { status: body.status },
  })

  return NextResponse.json({ ok: true })
}
