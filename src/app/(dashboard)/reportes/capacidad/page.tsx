import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { CapacidadReportView } from '@/components/reportes/CapacidadReportView'

export const dynamic = 'force-dynamic'

export default async function CapacidadReportPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? ''
  const allowed = ['ADMINISTRADOR', 'SUPERVISOR'].includes(role)

  if (!allowed) {
    return <AccessDenied message="Este reporte está disponible solo para Administradores y Supervisores." />
  }

  return (
    <Suspense fallback={<div className="text-[#666]">Cargando…</div>}>
      <CapacidadReportView canExport user={session?.user?.name ?? 'Usuario'} />
    </Suspense>
  )
}
