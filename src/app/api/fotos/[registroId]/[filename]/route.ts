import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { r2Download } from '@/lib/r2'

/**
 * Sirve una foto de etiquetado almacenada en Cloudflare R2.
 * Requiere sesión iniciada (misma protección que el resto de la app).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { registroId: string; filename: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const r2Key = `fotos/${params.registroId}/${params.filename}`

  try {
    const { buffer, contentType } = await r2Download(r2Key)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  }
}
