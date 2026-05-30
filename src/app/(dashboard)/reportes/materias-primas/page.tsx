import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccessDenied } from '@/components/ui/AccessDenied'
import { MateriasPrimasReportView } from '@/components/reportes/MateriasPrimasReportView'

export const dynamic = 'force-dynamic'

export default async function MateriasPrimasReportPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? ''
  const allowed = ['ADMINISTRADOR', 'SUPERVISOR'].includes(role)

  if (!allowed) {
    return <AccessDenied message="Este reporte está disponible solo para Administradores y Supervisores." />
  }

  return (
    <Suspense fallback={<div className="text-[#666]">Cargando…</div>}>
      <MateriasPrimasReportView canExport user={session?.user?.name ?? 'Usuario'} />
    </Suspense>
  )
}
