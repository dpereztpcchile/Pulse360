import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/api-auth'

const VALID_CATEGORY = ['CALIDAD', 'INOCUIDAD', 'PROCESO', 'PROVEEDOR']
const VALID_SEVERITY = ['CRITICA', 'MAYOR', 'MENOR']
const VALID_STATUS = ['ABIERTA', 'EN_INVESTIGACION', 'ACCION_CORRECTIVA', 'CERRADA']

export async function GET(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const category = searchParams.get('category')
  const area = searchParams.get('area')

  const where: Record<string, unknown> = {}
  if (status && VALID_STATUS.includes(status)) where.status = status
  if (severity && VALID_SEVERITY.includes(severity)) where.severity = severity
  if (category && VALID_CATEGORY.includes(category)) where.category = category
  if (area) where.area = { contains: area, mode: 'insensitive' }

  const ncs = await prisma.nonConformity.findMany({ where, orderBy: { ncNumber: 'desc' } })
  return NextResponse.json(ncs)
}

/** Crear NC: todos los roles. Registra el cambio de estado inicial (→ ABIERTA). */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { area, category, severity, title, description, responsible, dueDate, evidenceUrl, evidenceName } = body

  if (!area?.trim() || !title?.trim() || !description?.trim() || !responsible?.trim()) {
    return NextResponse.json({ error: 'Área, título, descripción y responsable son obligatorios' }, { status: 400 })
  }
  if (!VALID_CATEGORY.includes(category)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }
  if (!VALID_SEVERITY.includes(severity)) {
    return NextResponse.json({ error: 'Gravedad inválida' }, { status: 400 })
  }
  if (!dueDate) {
    return NextResponse.json({ error: 'La fecha límite es obligatoria' }, { status: 400 })
  }

  const year = new Date().getFullYear()
  const count = await prisma.nonConformity.count()
  const ncNumber = `NC-${year}-${String(count + 1).padStart(4, '0')}`

  const nc = await prisma.nonConformity.create({
    data: {
      ncNumber,
      area: area.trim(),
      category,
      severity,
      title: title.trim(),
      description: description.trim(),
      responsible: responsible.trim(),
      dueDate: new Date(dueDate),
      evidenceUrl: evidenceUrl?.trim() || null,
      evidenceName: evidenceName?.trim() || null,
      createdBy: session.user.name ?? null,
      status: 'ABIERTA',
      history: {
        create: { toStatus: 'ABIERTA', changedBy: session.user.name ?? 'Sistema', note: 'No conformidad creada' },
      },
    },
  })

  return NextResponse.json({ id: nc.id, ncNumber: nc.ncNumber }, { status: 201 })
}
