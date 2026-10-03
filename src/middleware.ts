import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Si el usuario debe cambiar su contraseña (primer ingreso o reset),
    // se le bloquea el acceso a cualquier ruta protegida hasta que lo haga.
    if (token?.mustChangePassword && pathname !== '/cambiar-clave') {
      return NextResponse.redirect(new URL('/cambiar-clave', req.url))
    }

    // Rutas de administrador únicamente
    const adminRoutes = ['/configuracion', '/admin']
    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (token?.role !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Rutas de supervisor o admin
    const supervisorRoutes = ['/reportes']
    if (supervisorRoutes.some((r) => pathname.startsWith(r))) {
      if (token?.role === 'OPERADOR') {
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
