import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { MANAGED_MODULE_KEYS, isManagedRole } from '@/lib/modules'
import { getAllowedModuleKeys, getUserPermissionOverrides } from '@/lib/permissions'

/**
 * Devuelve, para un usuario puntual:
 * - roleAllowed: el conjunto efectivo de módulos que le da su rol (default + overrides de rol)
 * - overrides: solo lo explícitamente guardado en UserPermission para este usuario
 *   (true = forzado permitido, false = forzado bloqueado; ausente = hereda del rol)
 */
export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  if (user.role === 'ADMINISTRADOR') {
    // Administrador siempre tiene acceso total; no se gestionan overrides para él.
    return NextResponse.json({
      role: user.role,
      roleAllowed: MANAGED_MODULE_KEYS,
      overrides: {},
      isAdmin: true,
    })
  }

  const roleAllowed = isManagedRole(user.role) ? Array.from(await getAllowedModuleKeys(user.role)) : []
  const overrides = await getUserPermissionOverrides(user.id)

  return NextResponse.json({ role: user.role, roleAllowed, overrides, isAdmin: false })
}

/**
 * Guarda overrides individuales para un usuario. Body: { changes: { moduleKey, allowed: boolean | null }[] }
 * allowed = null => elimina el override (vuelve a heredar del rol).
 */
export async function PUT(req: Request, { params }: { params: { userId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (user.role === 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'No se pueden definir overrides para un Administrador' }, { status: 400 })
  }

  const body = await req.json()
  const changes = Array.isArray(body?.changes) ? body.changes : null
  if (!changes) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  for (const c of changes) {
    if (!MANAGED_MODULE_KEYS.includes(c.moduleKey) || !(c.allowed === null || typeof c.allowed === 'boolean')) {
      return NextResponse.json({ error: `Entrada inválida: ${JSON.stringify(c)}` }, { status: 400 })
    }
  }

  await prisma.$transaction(
    changes.map((c: { moduleKey: string; allowed: boolean | null }) =>
      c.allowed === null
        ? prisma.userPermission.deleteMany({ where: { userId: user.id, moduleKey: c.moduleKey } })
        : prisma.userPermission.upsert({
            where: { userId_moduleKey: { userId: user.id, moduleKey: c.moduleKey } },
            create: { userId: user.id, moduleKey: c.moduleKey, allowed: c.allowed },
            update: { allowed: c.allowed },
          })
    )
  )

  return NextResponse.json({ ok: true })
}
