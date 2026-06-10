// Módulos temporalmente bloqueados (en construcción). Se irán habilitando uno a uno.
// Para reactivar un módulo, basta con quitar su ruta de esta lista.
export const BLOCKED_MODULES = [
  '/materias-primas',
  '/despacho',
  '/no-conformidades',
  '/alertas',
] as const

/** True si la ruta pertenece a un módulo bloqueado. */
export function isModuleBlocked(pathname: string): boolean {
  return BLOCKED_MODULES.some((m) => pathname === m || pathname.startsWith(m + '/'))
}
