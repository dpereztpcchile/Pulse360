import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { r2Download } from '@/lib/r2'

/** Sirve un archivo de evidencia de No Conformidad almacenado en R2 (requiere sesión). */
export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const r2Key = `nc-evidencias/${params.filename}`

  try {
    const { buffer, contentType } = await r2Download(r2Key)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }
}
