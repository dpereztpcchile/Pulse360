import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { MANAGED_MODULES } from '@/lib/modules'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Si el usuario debe cambiar su contraseña (primer ingreso o reset),
    // se le bloquea el acceso a cualquier ruta protegida hasta que lo haga.
    if (token?.mustChangePassword && pathname !== '/cambiar-clave') {
      return NextResponse.redirect(new URL('/cambiar-clave', req.url))
    }

    // Rutas de administrador únicamente (gestión de usuarios, configuración
    // del sistema y carga de archivos). No forman parte de la matriz de
    // permisos por rol: siempre son exclusivas de ADMINISTRADOR.
    const adminRoutes = ['/configuracion', '/admin', '/carga-archivos']
    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (token?.role !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Módulos gestionados por la matriz de permisos por rol (ver
    // src/lib/modules.ts y src/lib/permissions.ts). ADMINISTRADOR siempre
    // pasa (su JWT ya trae allowedModules con todos los módulos).
    const module = MANAGED_MODULES.find((m) => pathname.startsWith(m.href))
    if (module) {
      const allowed = (token?.allowedModules as string[] | undefined) ?? []
      if (!allowed.includes(module.key)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/produccion/:path*',
    '/materias-primas/:path*',
    '/despacho/:path*',
    '/no-conformidades/:path*',
    '/capacidad/:path*',
    '/alertas/:path*',
    '/reportes/:path*',
    '/configuracion/:path*',
    '/admin/:path*',
    '/tablet/:path*',
    '/carga-archivos/:path*',
  ],
}
