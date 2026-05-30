import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FileBarChart } from 'lucide-react'
import { ReportsCenter } from '@/components/reportes/ReportsCenter'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-pulse-red" /> Reportes
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Consolida datos históricos y genera informes con gráficos exportables</p>
      </div>

      <ReportsCenter role={role} />
    </div>
  )
}
