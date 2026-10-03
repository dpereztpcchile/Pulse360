import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { getFullPermissionMatrix } from '@/lib/permissions'
import { MANAGED_MODULE_KEYS, MANAGED_ROLES, isManagedRole } from '@/lib/modules'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const matrix = await getFullPermissionMatrix()
  return NextResponse.json({ matrix })
}

/**
 * Guarda la matriz completa. Body: { changes: { role, moduleKey, allowed }[] }
 * Solo se aceptan roles/módulos de la lista gestionada; ADMINISTRADOR no se
 * acepta nunca (siempre tiene acceso total, no se guarda en la base de datos).
 */
export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const changes = Array.isArray(body?.changes) ? body.changes : null
  if (!changes) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  for (const c of changes) {
    if (!isManagedRole(c.role) || !MANAGED_MODULE_KEYS.includes(c.moduleKey) || typeof c.allowed !== 'boolean') {
      return NextResponse.json({ error: `Entrada inválida: ${JSON.stringify(c)}` }, { status: 400 })
    }
  }

  await prisma.$transaction(
    changes.map((c: { role: string; moduleKey: string; allowed: boolean }) =>
      prisma.rolePermission.upsert({
        where: { role_moduleKey: { role: c.role as any, moduleKey: c.moduleKey } },
        create: { role: c.role as any, moduleKey: c.moduleKey, allowed: c.allowed },
        update: { allowed: c.allowed },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
