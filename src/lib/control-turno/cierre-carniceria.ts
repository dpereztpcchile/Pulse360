// PULSE 360 — Cierre diario de Carnicería.
// Snapshot de los Kg de MATERIA PRIMA REAL procesados en el día, para reportes.
import { prisma } from '@/lib/prisma'
import { dayBounds } from './service'

export async function cerrarDiaCarniceria(fechaStr?: string | null) {
  const { start, end, day } = dayBounds(fechaStr)

  const programas = await prisma.programaCarniceria.findMany({
    where: { fecha: { gte: start, lte: end } },
    include: { cortes: { orderBy: { orden: 'asc' } } },
  })
  const cortes = programas.flatMap((p) => p.cortes)
  const completados = cortes.filter((c) => c.estado === 'COMPLETADO')

  const dotacion = programas.reduce((m, p) => Math.max(m, p.dotacion), 0)
  const totalKgMPReal = Math.round(completados.reduce((a, c) => a + (c.kgMPReal ?? 0), 0))
  const totalKgMPTeorico = Math.round(cortes.reduce((a, c) => a + (c.kgMPTeorico ?? 0), 0))
  const hhTotales = Math.round(completados.reduce((a, c) => a + (c.hhReales ?? 0), 0) * 10) / 10
  const prodRealPromedio = hhTotales > 0 ? Math.round((totalKgMPReal / hhTotales) * 10) / 10 : null

  const detalle = cortes.map((c) => ({
    sku: c.sku, nombre: c.nombre, orden: c.orden, estado: c.estado,
    kgMPTeorico: c.kgMPTeorico, kgMPReal: c.kgMPReal, hhReales: c.hhReales, prodReal: c.prodReal,
  }))

  const data = {
    dotacion, totalKgMPReal, totalKgMPTeorico,
    cortesTotal: cortes.length, cortesCompletados: completados.length,
    hhTotales, prodRealPromedio, detalle, cerradoEn: new Date(),
  }

  return prisma.cierreDiarioCarniceria.upsert({
    where: { fecha: day },
    create: { fecha: day, ...data },
    update: data,
  })
}
