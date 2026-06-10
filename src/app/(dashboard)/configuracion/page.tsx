import { Settings, Users, Building2, Shield } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRoleLabel, getRoleBadgeColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

const USUARIOS_DEMO = [
  { nombre: 'Carlos Administrador', email: 'admin@pulse360.com',      rol: 'ADMINISTRADOR', activo: true,  ultimoLogin: '28/05/2025 09:12' },
  { nombre: 'María Supervisora',    email: 'supervisor@pulse360.com',  rol: 'SUPERVISOR',    activo: true,  ultimoLogin: '28/05/2025 06:00' },
  { nombre: 'Juan Operador',        email: 'operador@pulse360.com',    rol: 'OPERADOR',      activo: true,  ultimoLogin: '28/05/2025 06:05' },
]

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-pulse-red" /> Configuración
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Administración de usuarios, plantas y sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { icon: Users,     label: 'Usuarios',    value: '3',  desc: 'activos' },
          { icon: Building2, label: 'Plantas',     value: '2',  desc: 'registradas' },
          { icon: Shield,    label: 'Roles',       value: '3',  desc: 'disponibles' },
        ].map(item => (
          <div key={item.label} className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-pulse-red/10">
              <item.icon className="w-6 h-6 text-pulse-red" />
            </div>
            <div>
              <p className="text-xs text-[#666] uppercase tracking-wider">{item.label}</p>
              <p className="font-rajdhani font-bold text-3xl text-white leading-tight">
                {item.value} <span className="text-sm font-normal text-[#666]">{item.desc}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de usuarios */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-border-dark flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#666]" /> Gestión de Usuarios
          </span>
          <button className="btn-primary text-xs py-1.5">+ Nuevo usuario</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Rol</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-left">Último acceso</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {USUARIOS_DEMO.map((u) => (
                <tr key={u.email} className="hover:bg-border-dark/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-white">{u.nombre}</td>
                  <td className="px-5 py-3.5 text-[#999] font-mono text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getRoleBadgeColor(u.rol))}>
                      {getRoleLabel(u.rol)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.activo ? 'bg-status-ok/10 text-status-ok' : 'bg-pulse-red/10 text-pulse-red'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#666] font-mono">{u.ultimoLogin}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-xs text-[#666] hover:text-white transition-colors px-2 py-1 rounded hover:bg-border-dark">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
