import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { NcTabs } from '@/components/no-conformidades/NcTabs'
import { NcCargaClient } from '@/components/no-conformidades/NcCargaClient'

export const dynamic = 'force-dynamic'

export default async function NoConformidadesCargaPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'
  const puedeCargar = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-pulse-red" /> No Conformidades
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Registro y seguimiento de NC cárnicas (carga desde Excel)</p>
      </div>

      <NcTabs />

      {puedeCargar ? (
        <NcCargaClient />
      ) : (
        <div className="card flex items-center gap-3 text-sm text-[#999]">
          <ShieldAlert className="w-5 h-5 text-status-warn shrink-0" />
          Solo Administrador o Supervisor pueden cargar el archivo de No Conformidades.
        </div>
      )}
    </div>
  )
}
