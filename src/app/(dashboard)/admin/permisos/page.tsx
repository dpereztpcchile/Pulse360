import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFullPermissionMatrix } from '@/lib/permissions'
import { MANAGED_MODULES, MANAGED_ROLES } from '@/lib/modules'
import { PermisosClient } from './PermisosClient'

export const dynamic = 'force-dynamic'

export default async function PermisosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  const matrix = await getFullPermissionMatrix()

  return (
    <PermisosClient
      roles={MANAGED_ROLES as unknown as string[]}
      modules={MANAGED_MODULES}
      initialMatrix={matrix as unknown as Record<string, Record<string, boolean>>}
    />
  )
}
