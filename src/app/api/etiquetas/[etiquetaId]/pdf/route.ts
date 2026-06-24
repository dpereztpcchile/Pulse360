import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EtiquetadoPDF } from '@/components/etiquetado/EtiquetadoPDF'

export async function GET(req: NextRequest, { params }: { params: { etiquetaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const registro = await prisma.registroEtiquetado.findUnique({
    where: { id: params.etiquetaId },
    include: {
      fotos: { select: { id: true, tipo: true, url: true, timestamp: true, operador: true } },
      checklist: { orderBy: { orden: 'asc' } },
      analisisIA: true,
      firmas: { orderBy: { firmadoEn: 'asc' } },
    },
  })

  if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  if (!['AUTORIZADO', 'VERIFICADO'].includes(registro.estado))
    return NextResponse.json({ error: 'PDF solo disponible para documentos AUTORIZADOS o VERIFICADOS' }, { status: 400 })

  try {
    const fotosConBase64 = await Promise.all(
      registro.fotos.map(async (foto) => {
        try {
          const { readFile } = await import('fs/promises')
          const { join } = await import('path')
          const FOTOS_DIR = process.env.FOTOS_DIR || join(process.cwd(), 'public', 'fotos')
          const relativePath = foto.url.replace(/^\/fotos\//, '')
          const buffer = await readFile(join(FOTOS_DIR, relativePath))
          const base64 = buffer.toString('base64')
          return { ...foto, base64: `data:image/jpeg;base64,${base64}` }
        } catch { return { ...foto, base64: null } }
      })
    )

    const pdfBuffer = await renderToBuffer(
      EtiquetadoPDF({
        registro: {
          ...registro,
          fechaElaboracion: registro.fechaElaboracion.toISOString(),
          fechaVencimiento: registro.fechaVencimiento.toISOString(),
          fechaFaena: registro.fechaFaena?.toISOString() ?? null,
          fecha: registro.fecha.toISOString(),
        },
        fotos: fotosConBase64.map(f => ({ ...f, timestamp: f.timestamp.toISOString() })),
        checklist: registro.checklist,
        analisisIA: registro.analisisIA ? { ...registro.analisisIA, procesadoEn: registro.analisisIA.procesadoEn.toISOString() } : null,
        firmas: registro.firmas.map(f => ({ ...f, firmadoEn: f.firmadoEn.toISOString() })),
      })
    )

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${registro.codigo}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 })
  }
}
