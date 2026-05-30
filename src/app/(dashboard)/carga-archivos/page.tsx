import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { FileUp } from 'lucide-react'
import { CargaProgramaClient } from '@/components/carga-programa/CargaProgramaClient'

export const dynamic = 'force-dynamic'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function CargaArchivosPage() {
  const session = await getServerSession(authOptions)
  // Acceso: solo Administrador
  if (session?.user?.role !== 'ADMINISTRADOR') {
    redirect('/dashboard?error=Sin+permisos')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileUp className="w-6 h-6 text-pulse-red" /> Carga de Archivos
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Carga centralizada del programa diario (.xlsx) para Carnicería y Molienda</p>
      </div>

      <CargaProgramaClient today={todayStr()} user={session.user?.name ?? 'Administrador'} />
    </div>
  )
}
