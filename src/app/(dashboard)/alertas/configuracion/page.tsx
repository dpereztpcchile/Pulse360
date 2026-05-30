import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Bell } from 'lucide-react'
import { AlertasTabs } from '@/components/alertas/AlertasTabs'
import { ConfigClient } from '@/components/alertas/ConfigClient'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { getOrCreateConfig } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionAlertasPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'ADMINISTRADOR'

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell className="w-6 h-6 text-pulse-red" /> Alertas
      </h1>
      <p className="text-sm text-[#666] mt-0.5">Configuración de umbrales y tipos de alerta</p>
    </div>
  )

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {header}
        <AlertasTabs isAdmin={isAdmin} />
        <AccessDenied message="La configuración de umbrales está disponible solo para Administradores." />
      </div>
    )
  }

  const [config, lines] = await Promise.all([
    getOrCreateConfig(),
    prisma.productionLine.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, name: true, code: true, oeeMin: true },
    }),
  ])

  // Extrae solo los campos editables (descarta id/updatedAt).
  const { id: _id, updatedAt: _u, ...configShape } = config

  return (
    <div className="space-y-6">
      {header}
      <AlertasTabs isAdmin={isAdmin} />
      <ConfigClient initialConfig={configShape} initialLines={lines} />
    </div>
  )
}
