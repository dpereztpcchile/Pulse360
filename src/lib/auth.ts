import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { getAllowedModuleKeys } from './permissions'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Credenciales requeridas')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { plant: true },
        })

        if (!user || !user.active) {
          throw new Error('Usuario no encontrado o inactivo')
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) {
          throw new Error('Contraseña incorrecta')
        }

        // Actualizar último login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Módulos a los que este rol tiene acceso (matriz de permisos por
        // rol). Se calcula una vez aquí y viaja en el JWT durante toda la
        // sesión (8h); si un administrador cambia la matriz, el usuario
        // afectado verá el cambio reflejado en su próximo inicio de sesión.
        const allowedModules = Array.from(await getAllowedModuleKeys(user.role))

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plantId: user.plantId,
          plantName: user.plant?.name ?? null,
          mustChangePassword: user.mustChangePassword,
          allowedModules,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.plantId = user.plantId
        token.plantName = user.plantName
        token.mustChangePassword = user.mustChangePassword
        token.allowedModules = user.allowedModules
      }
      // Permite refrescar el flag desde el cliente tras cambiar la contraseña
      // (signIn/update con session.mustChangePassword = false).
      if (trigger === 'update' && session?.mustChangePassword === false) {
        token.mustChangePassword = false
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.plantId = token.plantId as string | null
        session.user.plantName = token.plantName as string | null
        session.user.mustChangePassword = token.mustChangePassword as boolean
        session.user.allowedModules = (token.allowedModules as string[]) ?? []
      }
      return session
    },
  },
}
