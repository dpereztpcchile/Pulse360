import Link from 'next/link'
import { Settings, Users, Building2, Shield, ArrowRight, ShieldCheck } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getRoleLabel, getRoleBadgeColor, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  const [users, plantsCount, roleCounts] = await Promise.all([
    prisma.user.findMany({
      include: { plant: true },
      orderBy: { createdAt: 'asc' },
      take: 6,
    }),
    prisma.plant.count(),
    prisma.user.groupBy({ by: ['role'], _count: true }),
  ])

  const totalUsuarios = await prisma.user.count()
  const activos = await prisma.user.count({ where: { active: true } })

  function formatLastLogin(d: Date | null) {
    if (!d) return 'Nunca'
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(d)
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
          { icon: Users,     label: 'Usuarios',    value: String(totalUsuarios), desc: `${activos} activos` },
          { icon: Building2, label: 'Plantas',     value: String(plantsCount),   desc: 'registradas' },
          { icon: Shield,    label: 'Roles',       value: String(roleCounts.length), desc: 'en uso' },
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

      {/* Permisos por rol */}
      <div className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pulse-red/10">
            <ShieldCheck className="w-5 h-5 text-pulse-red" />
          </div>
          <div>
            <p className="font-semibold text-white">Permisos</p>
            <p className="text-xs text-[#666]">Define a qué módulos puede acceder cada rol, y ajusta excepciones puntuales por usuario</p>
          </div>
        </div>
        <Link href="/admin/permisos" className="btn-primary text-xs py-1.5 flex items-center gap-1.5 shrink-0">
          Gestionar permisos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabla de usuarios (vista rápida, solo lectura) */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-border-dark flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#666]" /> Usuarios ({totalUsuarios})
          </span>
          <Link href="/admin/usuarios" className="btn-primary text-xs py-1.5 flex items-center gap-1.5">
            Gestionar usuarios <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[#555]">Sin usuarios</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-border-dark/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-white">
                    {u.name}
                    {u.id === session.user.id && <span className="text-xs text-[#555] ml-1">(tú)</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#999] font-mono text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getRoleBadgeColor(u.role))}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.active ? 'bg-status-ok/10 text-status-ok' : 'bg-pulse-red/10 text-pulse-red'}`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#666] font-mono">{formatLastLogin(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalUsuarios > users.length && (
          <div className="px-5 py-3 border-t border-border-dark text-center">
            <Link href="/admin/usuarios" className="text-xs text-[#666] hover:text-white transition-colors">
              Ver los {totalUsuarios} usuarios →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
