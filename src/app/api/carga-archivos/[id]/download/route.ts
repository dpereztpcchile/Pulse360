import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'

// GET → descarga el .xlsx original almacenado para una carga
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const carga = await prisma.cargaPrograma.findUnique({ where: { id: params.id } })
  if (!carga || !carga.archivoData) {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 })
  }

  const buffer = Buffer.from(carga.archivoData, 'base64')
  const safeName = carga.archivoNombre.replace(/[^\w.\- ]+/g, '_') || 'programa.xlsx'

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
