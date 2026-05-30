import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

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
  ],
}
