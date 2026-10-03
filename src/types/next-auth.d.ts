import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      plantId: string | null
      plantName: string | null
      mustChangePassword: boolean
      /** Claves de módulos (ver src/lib/modules.ts) a los que este rol tiene
       *  acceso. Para ADMINISTRADOR incluye siempre todos los módulos. */
      allowedModules: string[]
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: string
    plantId: string | null
    plantName: string | null
    mustChangePassword: boolean
    allowedModules: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    plantId: string | null
    plantName: string | null
    mustChangePassword: boolean
    allowedModules: string[]
  }
}
