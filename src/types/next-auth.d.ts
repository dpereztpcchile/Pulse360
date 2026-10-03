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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    plantId: string | null
    plantName: string | null
    mustChangePassword: boolean
  }
}
