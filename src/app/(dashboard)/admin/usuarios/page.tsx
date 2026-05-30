import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UsersClient } from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  const [users, plants] = await Promise.all([
    prisma.user.findMany({ include: { plant: true }, orderBy: { createdAt: 'asc' } }),
    prisma.plant.findMany({ orderBy: { name: 'asc' } }),
  ])

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    plantId: u.plantId,
    plantName: u.plant?.name ?? null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }))

  const serializedPlants = plants.map((p) => ({ id: p.id, name: p.name }))

  return (
    <UsersClient
      initialUsers={serializedUsers}
      plants={serializedPlants}
      currentUserId={session.user.id}
    />
  )
}
