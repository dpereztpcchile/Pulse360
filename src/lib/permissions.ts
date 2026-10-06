import { prisma } from '@/lib/prisma'
import {
  MANAGED_MODULES,
  MANAGED_MODULE_KEYS,
  MANAGED_ROLES,
  DEFAULT_MODULE_PERMISSIONS,
  isManagedRole,
  type ManagedRole,
} from '@/lib/modules'

/**
 * Devuelve el conjunto de moduleKey habilitados para un rol.
 * - ADMINISTRADOR: acceso total a todos los módulos gestionados (bypass, no
 *   se consulta la base de datos).
 * - Roles no gestionados (valores inesperados / futuros): sin acceso a
 *   ningún módulo adicional, por seguridad (whitelist, no blacklist).
 * - Roles gestionados: se parte de los valores por defecto y se sobreescribe
 *   con cualquier fila explícita guardada en RolePermission para ese rol.
 */
export async function getAllowedModuleKeys(role: string): Promise<Set<string>> {
  if (role === 'ADMINISTRADOR') {
    return new Set(MANAGED_MODULE_KEYS)
  }
  if (!isManagedRole(role)) {
    return new Set()
  }

  const allowed = new Set(DEFAULT_MODULE_PERMISSIONS[role])

  const overrides = await prisma.rolePermission.findMany({ where: { role: role as any } })
  for (const o of overrides) {
    if (o.allowed) allowed.add(o.moduleKey)
    else allowed.delete(o.moduleKey)
  }

  return allowed
}

/** Verifica si un rol tiene acceso a un módulo puntual (por su moduleKey). */
export async function hasModuleAccess(role: string, moduleKey: string): Promise<boolean> {
  if (role === 'ADMINISTRADOR') return true
  const allowed = await getAllowedModuleKeys(role)
  return allowed.has(moduleKey)
}

/**
 * Devuelve el conjunto de moduleKey habilitados para un usuario específico,
 * combinando la matriz por rol (base) con sus overrides individuales
 * (UserPermission), que tienen siempre la última palabra:
 *
 *   ADMINISTRADOR          -> todos los módulos (bypass, no se consulta BD)
 *   rol no gestionado      -> ningún módulo (whitelist)
 *   resto                  -> default del rol + overrides de RolePermission
 *                             + overrides de UserPermission (prioridad máxima)
 *
 * Esto permite, por ejemplo, habilitar "Reportes" para un Operador puntual
 * sin afectar al resto de los usuarios con rol OPERADOR.
 */
export async function getAllowedModuleKeysForUser(userId: string, role: string): Promise<Set<string>> {
  if (role === 'ADMINISTRADOR') {
    return new Set(MANAGED_MODULE_KEYS)
  }

  const allowed = await getAllowedModuleKeys(role)

  const userOverrides = await prisma.userPermission.findMany({ where: { userId } })
  for (const o of userOverrides) {
    if (o.allowed) allowed.add(o.moduleKey)
    else allowed.delete(o.moduleKey)
  }

  return allowed
}

/**
 * Matriz de overrides por usuario para un usuario puntual (solo lo
 * explícitamente guardado en UserPermission, sin fusionar con el rol):
 * usada por la pantalla de administración para distinguir "heredado de rol"
 * de "forzado explícitamente" en la UI.
 */
export async function getUserPermissionOverrides(userId: string): Promise<Record<string, boolean>> {
  const overrides = await prisma.userPermission.findMany({ where: { userId } })
  const map: Record<string, boolean> = {}
  for (const o of overrides) {
    map[o.moduleKey] = o.allowed
  }
  return map
}

/**
 * Matriz completa rol × módulo para la pantalla de administración:
 * fusiona los valores por defecto con cualquier override guardado.
 */
export async function getFullPermissionMatrix() {
  const overrides = await prisma.rolePermission.findMany()

  const matrix: Record<ManagedRole, Record<string, boolean>> = {} as any
  for (const role of MANAGED_ROLES) {
    matrix[role] = {}
    for (const key of MANAGED_MODULE_KEYS) {
      matrix[role][key] = DEFAULT_MODULE_PERMISSIONS[role].includes(key)
    }
  }
  for (const o of overrides) {
    if (isManagedRole(o.role) && MANAGED_MODULE_KEYS.includes(o.moduleKey)) {
      matrix[o.role][o.moduleKey] = o.allowed
    }
  }
  return matrix
}

export { MANAGED_MODULES, MANAGED_MODULE_KEYS, MANAGED_ROLES }
