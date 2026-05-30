import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { ProduccionReportView } from '@/components/reportes/ProduccionReportView'

export const dynamic = 'force-dynamic'

export default async function ProduccionReportPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? ''
  const allowed = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'].includes(role)
  const canExport = ['ADMINISTRADOR', 'SUPERVISOR'].includes(role)

  if (!allowed) {
    return <AccessDenied message="No tienes acceso a este reporte." />
  }

  return (
    <Suspense fallback={<div className="text-[#666]">Cargando…</div>}>
      <ProduccionReportView canExport={canExport} user={session?.user?.name ?? 'Usuario'} />
    </Suspense>
  )
}
