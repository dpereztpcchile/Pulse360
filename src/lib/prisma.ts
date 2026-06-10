import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Cierre diario automático de Carnicería (23:50). Solo en el proceso del servidor,
// no durante el build de producción.
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  void import('./control-turno/scheduler').then((m) => m.startCierreScheduler()).catch(() => {})
}
