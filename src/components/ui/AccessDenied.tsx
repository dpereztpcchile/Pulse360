import { Lock } from 'lucide-react'

export function AccessDenied({ message = 'Esta sección está disponible solo para Administradores y Supervisores.' }: { message?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="p-3 rounded-full bg-pulse-red/10">
        <Lock className="w-7 h-7 text-pulse-red" />
      </div>
      <h2 className="text-lg font-semibold text-white">Acceso restringido</h2>
      <p className="text-sm text-[#888] max-w-sm">{message}</p>
    </div>
  )
}
