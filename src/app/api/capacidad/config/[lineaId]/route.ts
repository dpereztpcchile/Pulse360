import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { getLineasConfig } from '@/lib/capacidad'

export const dynamic = 'force-dynamic'

const parseHora = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh + mm / 60 }
function calcHH(opera: boolean, ingreso?: string | null, salida?: string | null, colacion = 0.5): number | null {
  if (!opera || !ingreso || !salida) return null
  return Math.round((parseHora(salida) - parseHora(ingreso) - colacion) * 100) / 100
}

interface DiaIn { dia: number; opera?: boolean; ingreso?: string | null; salida?: string | null; colacion?: number }
interface TurnoIn { nombre: string; personas?: number; activo?: boolean; horarioDias: DiaIn[] }
interface Prod { kgPorHora?: number | null; kgPorHH?: number | null; minsPorBatch?: number | null; kgPorBatch?: number | null; golpesPorMinuto?: number | null; setupMin?: number | null; setPointMin?: number | null; formatosDia?: number | null }
interface Body { turnos: TurnoIn[]; productividad?: Prod }

// PATCH → actualiza horarios y productividad de una línea (solo ADMIN)
export async function PATCH(req: Request, { params }: { params: { lineaId: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Solo un administrador puede editar horarios' }, { status: 403 })

  const linea = await prisma.linea.findUnique({ where: { id: params.lineaId }, include: { config: true } })
  if (!linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })

  const body = (await req.json()) as Body
  const email = session.user?.email ?? session.user?.name ?? 'admin'

  await prisma.$transaction(async (tx) => {
    // Productividad
    if (body.productividad) {
      const p = body.productividad
      const datos = {
        kgPorHora: p.kgPorHora ?? null, kgPorHH: p.kgPorHH ?? null, minsPorBatch: p.minsPorBatch ?? null, kgPorBatch: p.kgPorBatch ?? null,
        golpesPorMinuto: p.golpesPorMinuto ?? null, setupMin: p.setupMin ?? null, setPointMin: p.setPointMin ?? null, formatosDia: p.formatosDia ?? null,
      }
      await tx.configProductividad.upsert({
        where: { lineaId: linea.id },
        create: { lineaId: linea.id, tipo: linea.tipo, ...datos, actualizadoPor: email },
        update: { ...datos, actualizadoPor: email },
      })
    }
    // Turnos: reemplazo completo (cascade borra horarios)
    if (Array.isArray(body.turnos)) {
      await tx.turno.deleteMany({ where: { lineaId: linea.id } })
      for (let i = 0; i < body.turnos.length; i++) {
        const t = body.turnos[i]
        await tx.turno.create({
          data: {
            lineaId: linea.id, nombre: t.nombre || `Turno ${i + 1}`, personas: Math.max(1, Number(t.personas) || 1), activo: t.activo ?? true, orden: i + 1,
            horarioDias: {
              create: (t.horarioDias ?? []).map((d) => {
                const colacion = d.colacion ?? 0.5
                // Opera solo si tiene ingreso y salida válidos (evita estado inconsistente)
                const opera = (d.opera ?? false) && !!d.ingreso && !!d.salida
                return { dia: d.dia, opera, ingreso: opera ? d.ingreso ?? null : null, salida: opera ? d.salida ?? null : null, colacion, HH: calcHH(opera, d.ingreso, d.salida, colacion) }
              }),
            },
          },
        })
      }
    }
    await tx.linea.update({ where: { id: linea.id }, data: { actualizadoEn: new Date() } })
  })

  const lineas = await getLineasConfig()
  return NextResponse.json({ ok: true, linea: lineas.find((l) => l.id === linea.id) })
}
