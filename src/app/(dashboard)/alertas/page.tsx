import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Bell } from 'lucide-react'
import { AlertasTabs } from '@/components/alertas/AlertasTabs'
import { ActiveAlertsClient } from '@/components/alertas/ActiveAlertsClient'
import { generateAlerts, getActiveAlerts } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

export default async function AlertasPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'
  const isAdmin = role === 'ADMINISTRADOR'
  const canResolve = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  await generateAlerts()
  const initial = await getActiveAlerts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-pulse-red" /> Alertas
        </h1>
        <p className="text-sm text-[#666] mt-0.5">
          Centro de alertas generadas automáticamente por todos los módulos del sistema
        </p>
      </div>

      <AlertasTabs isAdmin={isAdmin} />
      <ActiveAlertsClient initial={initial} canResolve={canResolve} />
    </div>
  )
}
