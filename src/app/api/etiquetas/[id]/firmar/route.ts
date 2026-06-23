import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { RolFirma, EstadoEtiquetado } from '@/types/etiquetado'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const registroId = params.id
  const body = await req.json()

  const rolMap: Record<string, RolFirma> = {
    'Admin': 'VERIFICADOR', 'Supervisor': 'SUPERVISOR',
    'Operador': 'MAQUINISTA', 'Calidad': 'CALIDAD',
    'Verificador': 'VERIFICADOR', 'Maquinista': 'MAQUINISTA',
  }
  const rolFirma = rolMap[session.user.role]
  if (!rolFirma) return NextResponse.json({ error: 'Rol no habilitado para firmar' }, { status: 403 })

  const registro = await prisma.registroEtiquetado.findUnique({
    where: { id: registroId }, include: { firmas: true },
  })
  if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  if (rolFirma === 'MAQUINISTA' && registro.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Maquinista solo firma en BORRADOR' }, { status: 400 })
  if ((rolFirma === 'CALIDAD' || rolFirma === 'SUPERVISOR') && registro.estado !== 'EN_REVISION')
    return NextResponse.json({ error: 'Solo firman en EN_REVISION' }, { status: 400 })
  if (rolFirma === 'VERIFICADOR' && registro.estado !== 'AUTORIZADO')
    return NextResponse.json({ error: 'Verificador solo firma en AUTORIZADO' }, { status: 400 })

  const firmaExistente = registro.firmas.find(f => f.rol === rolFirma)
  if (firmaExistente && !firmaExistente.esRechazo)
    return NextResponse.json({ error: `Ya existe firma de ${rolFirma}` }, { status: 409 })

  if (body.esRechazo && !body.motivoRechazo?.trim())
    return NextResponse.json({ error: 'Se requiere motivo de rechazo' }, { status: 400 })

  const resultado = await prisma.$transaction(async (tx) => {
    const firma = await tx.firmaEtiquetado.upsert({
      where: { registroId_rol: { registroId, rol: rolFirma } },
      create: { registroId, rol: rolFirma, userId: session.user.id, nombreUsuario: session.user.name || rolFirma, observacion: body.observacion, esRechazo: body.esRechazo ?? false, motivoRechazo: body.motivoRechazo },
      update: { firmadoEn: new Date(), observacion: body.observacion, esRechazo: body.esRechazo ?? false, motivoRechazo: body.motivoRechazo },
    })

    let nuevoEstado: EstadoEtiquetado = registro.estado

    if (body.esRechazo) {
      nuevoEstado = 'RECHAZADO'
      await tx.firmaEtiquetado.deleteMany({ where: { registroId, rol: { in: ['CALIDAD', 'SUPERVISOR'] } } })
    } else {
      const todasFirmas = await tx.firmaEtiquetado.findMany({ where: { registroId, esRechazo: false } })
      const roles = todasFirmas.map(f => f.rol)
      if (rolFirma === 'MAQUINISTA') nuevoEstado = 'EN_REVISION'
      else if (roles.includes('CALIDAD') && roles.includes('SUPERVISOR') && !roles.includes('VERIFICADOR')) nuevoEstado = 'AUTORIZADO'
      else if (roles.includes('VERIFICADOR')) nuevoEstado = 'VERIFICADO'
    }

    const registroActualizado = await tx.registroEtiquetado.update({
      where: { id: registroId },
      data: { estado: nuevoEstado, motivoRechazo: body.esRechazo ? body.motivoRechazo : undefined },
      include: { firmas: true, checklist: { orderBy: { orden: 'asc' } }, fotos: { select: { id: true, tipo: true, url: true, timestamp: true } }, analisisIA: true },
    })
    return { registroActualizado, firma, nuevoEstado }
  })

  const mensajes: Record<EstadoEtiquetado, string> = {
    BORRADOR: 'Borrador guardado.', EN_REVISION: 'Enviado a revisión.',
    AUTORIZADO: 'Documento AUTORIZADO.', VERIFICADO: 'Documento VERIFICADO.',
    RECHAZADO: 'Documento rechazado.',
  }

  return NextResponse.json({
    registro: resultado.registroActualizado,
    firma: resultado.firma,
    estadoNuevo: resultado.nuevoEstado,
    mensaje: body.esRechazo ? 'Rechazo registrado.' : mensajes[resultado.nuevoEstado],
  })
}
