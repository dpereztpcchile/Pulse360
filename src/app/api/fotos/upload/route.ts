import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const FOTOS_DIR = process.env.FOTOS_DIR || path.join(process.cwd(), 'public', 'fotos')
const FOTOS_URL = process.env.FOTOS_URL || '/fotos'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { registroId, tipo, base64, operador } = body

  if (!registroId || !tipo || !base64 || !operador)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  if (!['ETIQUETA_PT', 'MATERIA_PRIMA'].includes(tipo))
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })

  const registro = await prisma.registroEtiquetado.findUnique({
    where: { id: registroId }, select: { id: true, estado: true },
  })
  if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  if (registro.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo se pueden subir fotos en estado BORRADOR' }, { status: 400 })

  const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64
  const ext = 'jpg'
  const dirRegistro = path.join(FOTOS_DIR, registroId)
  if (!existsSync(dirRegistro)) await mkdir(dirRegistro, { recursive: true })

  const filename = `${tipo.toLowerCase()}_${Date.now()}.${ext}`
  const filepath = path.join(dirRegistro, filename)
  await writeFile(filepath, Buffer.from(base64Clean, 'base64'))

  const url = `${FOTOS_URL}/${registroId}/${filename}`

  const fotoExistente = await prisma.fotoEtiquetado.findFirst({
    where: { registroId, tipo },
  })

  let foto
  if (fotoExistente) {
    foto = await prisma.fotoEtiquetado.update({
      where: { id: fotoExistente.id },
      data: { url, base64: base64Clean, timestamp: new Date(), operador },
    })
  } else {
    foto = await prisma.fotoEtiquetado.create({
      data: { registroId, tipo, url, base64: base64Clean, timestamp: new Date(), operador },
    })
  }

  return NextResponse.json({ id: foto.id, tipo: foto.tipo, url: foto.url, timestamp: foto.timestamp }, { status: 201 })
}
