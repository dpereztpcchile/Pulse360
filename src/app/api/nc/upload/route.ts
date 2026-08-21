import { NextResponse } from 'next/server'
import { getSession } from '@/lib/api-auth'
import { r2Upload } from '@/lib/r2'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

/** Sube un archivo de evidencia a Cloudflare R2 y devuelve su URL (protegida) de acceso. */
export async function POST(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 5 MB' }, { status: 400 })
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido (imágenes o PDF)' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^\w.\-]/g, '_')
  const fileName = `${Date.now()}-${safeName}`
  const r2Key = `nc-evidencias/${fileName}`
  await r2Upload(r2Key, bytes, file.type || 'application/octet-stream')

  return NextResponse.json({ url: `/api/nc/upload/${fileName}`, name: file.name })
}
