import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/api-auth'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

/** Sube un archivo de evidencia a /public/uploads y devuelve su URL pública. */
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
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fileName), bytes)

  return NextResponse.json({ url: `/uploads/${fileName}`, name: file.name })
}
