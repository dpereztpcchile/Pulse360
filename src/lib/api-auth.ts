import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

/** Devuelve la sesión solo si el usuario es ADMINISTRADOR, null en caso contrario. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMINISTRADOR') return null
  return session
}

/** Devuelve la sesión solo si el rol del usuario está en la lista permitida. */
export async function requireRole(roles: string[]) {
  const session = await getServerSession(authOptions)
  if (!session || !roles.includes(session.user.role)) return null
  return session
}

/** Devuelve la sesión actual (o null). */
export async function getSession() {
  return getServerSession(authOptions)
}
