import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Bell } from 'lucide-react'
import { AlertasTabs } from '@/components/alertas/AlertasTabs'
import { HistoryClient } from '@/components/alertas/HistoryClient'
import { getAlertHistory } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

export default async function HistorialAlertasPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'ADMINISTRADOR'

  const initial = await getAlertHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-pulse-red" /> Alertas
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Historial de alertas resueltas y métricas de respuesta</p>
      </div>

      <AlertasTabs isAdmin={isAdmin} />
      <HistoryClient initial={initial} />
    </div>
  )
}
