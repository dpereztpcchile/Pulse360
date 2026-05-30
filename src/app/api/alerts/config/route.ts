import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { getOrCreateConfig } from '@/lib/alerts'

const TOGGLE_FIELDS = [
  'enableLineStopped', 'enableOeeLow', 'enableShiftNoRecord', 'enableStockLow',
  'enableExpiry', 'enableTempRange', 'enableDispatchDelay', 'enableDispatchNoTransporter',
  'enableNcCritical', 'enableNcOverdue', 'enableCapacityOver',
] as const

/** Devuelve la configuración de umbrales + OEE mínimo por línea. Solo Administrador. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Solo Administradores acceden a la configuración de umbrales' }, { status: 403 })
  }
  const [config, lines] = await Promise.all([
    getOrCreateConfig(),
    prisma.productionLine.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, name: true, code: true, oeeMin: true },
    }),
  ])
  return NextResponse.json({ config, lines })
}

/** Actualiza umbrales globales, toggles y OEE mínimo por línea. Solo Administrador. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Solo Administradores pueden modificar la configuración' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const config = await getOrCreateConfig()
  const data: Record<string, unknown> = {}

  // Umbrales numéricos
  if (body.oeeMinDefault !== undefined) {
    const n = Number(body.oeeMinDefault)
    if (Number.isNaN(n) || n < 0 || n > 100) return NextResponse.json({ error: 'OEE mínimo debe estar entre 0 y 100' }, { status: 400 })
    data.oeeMinDefault = n
  }
  if (body.expiryWarningDays !== undefined) {
    const n = parseInt(body.expiryWarningDays, 10)
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: 'Días de anticipación inválidos' }, { status: 400 })
    data.expiryWarningDays = n
  }
  if (body.dispatchDelayHours !== undefined) {
    const n = Number(body.dispatchDelayHours)
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: 'Horas de tolerancia inválidas' }, { status: 400 })
    data.dispatchDelayHours = n
  }
  if (body.capacityOverPct !== undefined) {
    const n = Number(body.capacityOverPct)
    if (Number.isNaN(n) || n < 0 || n > 100) return NextResponse.json({ error: '% de ocupación debe estar entre 0 y 100' }, { status: 400 })
    data.capacityOverPct = n
  }

  // Toggles
  for (const f of TOGGLE_FIELDS) {
    if (body[f] !== undefined) data[f] = Boolean(body[f])
  }

  const ops: Promise<unknown>[] = [
    prisma.alertConfig.update({ where: { id: config.id }, data }),
  ]

  // OEE mínimo por línea
  if (Array.isArray(body.lines)) {
    for (const l of body.lines) {
      const n = Number(l.oeeMin)
      if (l.id && !Number.isNaN(n) && n >= 0 && n <= 100) {
        ops.push(prisma.productionLine.update({ where: { id: l.id }, data: { oeeMin: n } }))
      }
    }
  }

  await Promise.all(ops)
  return NextResponse.json({ ok: true })
}
