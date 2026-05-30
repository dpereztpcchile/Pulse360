import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireRole } from '@/lib/api-auth'
import { getConfigTurnos } from '@/lib/capacidad/service'

// GET  → configuración de turnos de Carnicería
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { configs } = await getConfigTurnos()
  return NextResponse.json(configs)
}

// PUT  → actualiza la configuración de turnos (cantPersonas, hhPorDia, horarios, colación, activo)
export async function PUT(req: Request) {
  if (!(await requireRole(['ADMINISTRADOR', 'SUPERVISOR']))) {
    return NextResponse.json({ error: 'No autorizado para editar la configuración' }, { status: 403 })
  }
  const body = await req.json()
  const turnos = body.turnos
  if (!Array.isArray(turnos)) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })

  for (const t of turnos) {
    if (!t.id) continue
    await prisma.configuracionTurnos.update({
      where: { id: t.id },
      data: {
        cantPersonas: Math.max(0, Number(t.cantPersonas) || 0),
        colacionMin: Math.max(0, Number(t.colacionMin) || 0),
        activo: !!t.activo,
        ...(Array.isArray(t.hhPorDia) ? { hhPorDia: t.hhPorDia.map((n: unknown) => Number(n) || 0) } : {}),
        ...(Array.isArray(t.entradas) ? { entradas: t.entradas.map((s: unknown) => String(s ?? '')) } : {}),
        ...(Array.isArray(t.salidas) ? { salidas: t.salidas.map((s: unknown) => String(s ?? '')) } : {}),
      },
    })
  }

  const { configs } = await getConfigTurnos()
  return NextResponse.json(configs)
}
