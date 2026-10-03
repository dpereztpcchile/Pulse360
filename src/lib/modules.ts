// Definición central de los módulos gestionables por el sistema de permisos
// por rol (matriz rol × módulo, Opción A). Esta lista es la fuente de verdad
// usada tanto por la pantalla de administración (/admin/permisos) como por
// las verificaciones de acceso en cada página y en el Sidebar.
//
// Notas importantes:
// - "Dashboard" NO está en esta lista: todo usuario autenticado lo ve siempre,
//   sin excepción (evita dejar a un rol sin ninguna pantalla de aterrizaje).
// - "Usuarios" y "Configuración" (y "Carga de Archivos") tampoco están aquí:
//   son pantallas de administración/sistema reservadas exclusivamente para
//   ADMINISTRADOR, igual que hoy (ver Sidebar.tsx `adminOnly`). No se exponen
//   en la matriz para evitar que, por error, un rol no-admin reciba acceso a
//   gestión de usuarios o configuración del sistema.
// - ADMINISTRADOR siempre tiene acceso total a todos los módulos y no se
//   gestiona ni se guarda en la base de datos (bypass explícito en el código).

export interface ModuleDef {
  /** Identificador estable usado en la base de datos (RolePermission.moduleKey). */
  key: string
  label: string
  href: string
}

export const MANAGED_MODULES: ModuleDef[] = [
  { key: 'produccion',        label: 'Producción',        href: '/produccion' },
  { key: 'materias-primas',   label: 'Materias Primas',   href: '/materias-primas' },
  { key: 'despacho',          label: 'Despacho',          href: '/despacho' },
  { key: 'no-conformidades',  label: 'No Conformidades',  href: '/no-conformidades' },
  { key: 'capacidad',         label: 'Capacidad',         href: '/capacidad' },
  { key: 'alertas',           label: 'Alertas',           href: '/alertas' },
  { key: 'reportes',          label: 'Reportes',          href: '/reportes' },
]

export const MANAGED_MODULE_KEYS = MANAGED_MODULES.map((m) => m.key)

/** Roles gestionables desde la matriz. ADMINISTRADOR siempre tiene acceso total. */
export const MANAGED_ROLES = ['SUPERVISOR', 'OPERADOR', 'CALIDAD', 'VERIFICADOR', 'VISITANTE'] as const
export type ManagedRole = (typeof MANAGED_ROLES)[number]

/**
 * Permisos por defecto, usados mientras no exista una fila guardada en la
 * base de datos para un (rol, módulo) específico. Se calculan para que sean
 * EXACTAMENTE equivalentes al acceso que cada rol ya tenía antes de existir
 * esta matriz (la mayoría de los módulos no tenían ningún control de acceso
 * propio; "Capacidad" sí estaba restringido a ADMINISTRADOR/SUPERVISOR).
 * Así, al desplegar esta función, ningún usuario pierde acceso a algo que ya
 * podía ver — el administrador puede luego ajustar la matriz libremente.
 *
 * La única excepción es VISITANTE, un rol nuevo sin comportamiento previo:
 * por pedido explícito del usuario, parte con acceso a NINGÚN módulo
 * adicional (solo ve el Dashboard operacional, que no se gestiona aquí).
 */
export const DEFAULT_MODULE_PERMISSIONS: Record<ManagedRole, string[]> = {
  SUPERVISOR:   ['produccion', 'materias-primas', 'despacho', 'no-conformidades', 'capacidad', 'alertas', 'reportes'],
  OPERADOR:     ['produccion', 'materias-primas', 'despacho', 'no-conformidades', 'alertas', 'reportes'],
  CALIDAD:      ['produccion', 'materias-primas', 'despacho', 'no-conformidades', 'alertas', 'reportes'],
  VERIFICADOR:  ['produccion', 'materias-primas', 'despacho', 'no-conformidades', 'alertas', 'reportes'],
  VISITANTE:    [],
}

export function isManagedRole(role: string): role is ManagedRole {
  return (MANAGED_ROLES as readonly string[]).includes(role)
}
