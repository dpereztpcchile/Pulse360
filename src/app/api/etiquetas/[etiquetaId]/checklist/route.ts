import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { ResultadoItem, ChecklistKey } from '@/types/etiquetado'

export async function PATCH(req: NextRequest, { params }: { params: { etiquetaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const registroId = params.etiquetaId
  const body = await req.json()

  const registro = await prisma.registroEtiquetado.findUnique({
    where: { id: registroId }, select: { estado: true },
  })
  if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  if (registro.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo editable en estado BORRADOR' }, { status: 400 })

  if (!body.items || !Array.isArray(body.items))
    return NextResponse.json({ error: 'Se requiere un array de items' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    for (const item of body.items as Array<{ key: ChecklistKey; resultado: ResultadoItem; notaManual?: string }>) {
      const existing = await tx.checklistItem.findUnique({
        where: { registroId_itemKey: { registroId, itemKey: item.key } },
      })
      if (!existing) continue
      const esOverride = existing.resultadoIA !== null && existing.resultadoIA !== item.resultado
      await tx.checklistItem.update({
        where: { registroId_itemKey: { registroId, itemKey: item.key } },
        data: { resultado: item.resultado, override: esOverride, notaManual: item.notaManual ?? null },
      })
    }
    if (body.observaciones !== undefined) {
      await tx.registroEtiquetado.update({
        where: { id: registroId }, data: { observaciones: body.observaciones },
      })
    }
  })

  const checklist = await prisma.checklistItem.findMany({
    where: { registroId }, orderBy: { orden: 'asc' },
  })
  return NextResponse.json({ checklist })
}
