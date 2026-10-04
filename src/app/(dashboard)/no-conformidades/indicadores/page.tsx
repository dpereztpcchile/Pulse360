import { AlertTriangle } from 'lucide-react'
import { NcTabs } from '@/components/no-conformidades/NcTabs'
import { NcIndicadoresClient } from '@/components/no-conformidades/NcIndicadoresClient'

export const dynamic = 'force-dynamic'

export default async function NoConformidadesIndicadoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-pulse-red" /> No Conformidades
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Registro y seguimiento de NC cárnicas (carga desde Excel)</p>
      </div>

      <NcTabs />
      <NcIndicadoresClient />
    </div>
  )
}
