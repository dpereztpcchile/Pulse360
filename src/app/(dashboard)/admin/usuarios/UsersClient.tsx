'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Plus, Pencil, KeyRound, Power, X, Loader2, AlertCircle, Search, Shield,
} from 'lucide-react'
import { cn, getRoleLabel } from '@/lib/utils'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  plantId: string | null
  plantName: string | null
  lastLoginAt: string | null
}
interface Plant { id: string; name: string }

interface Props {
  initialUsers: UserRow[]
  plants: Plant[]
  currentUserId: string
}

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR']

function roleBadge(role: string) {
  switch (role) {
    case 'ADMINISTRADOR': return 'bg-pulse-red/15 text-pulse-red border border-pulse-red/30'
    case 'SUPERVISOR':    return 'bg-status-warn/15 text-status-warn border border-status-warn/30'
    default:              return 'bg-[#2A2A2A] text-[#999] border border-[#3A3A3A]'
  }
}

function formatLastLogin(iso: string | null) {
  if (!iso) return 'Nunca'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function UsersClient({ initialUsers, plants, currentUserId }: Props) {
  const router = useRouter()
  const [roleFilter, setRoleFilter] = useState<string>('TODOS')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  const [search, setSearch] = useState('')

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERADOR', plantId: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Modal reset password
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [newPass, setNewPass] = useState('')

  const filtered = useMemo(() => {
    return initialUsers.filter((u) => {
      if (roleFilter !== 'TODOS' && u.role !== roleFilter) return false
      if (statusFilter === 'ACTIVO' && !u.active) return false
      if (statusFilter === 'INACTIVO' && u.active) return false
      if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [initialUsers, roleFilter, statusFilter, search])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'OPERADOR', plantId: plants[0]?.id ?? '' })
    setError('')
    setModalOpen(true)
  }

  function openEdit(u: UserRow) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, plantId: u.plantId ?? '' })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      let res: Response
      if (editing) {
        res = await fetch(`/api/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, role: form.role, plantId: form.plantId }),
        })
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        setBusy(false)
        return
      }
      setModalOpen(false)
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActive(u: UserRow) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    if (res.ok) router.refresh()
    else {
      const data = await res.json()
      alert(data.error ?? 'No se pudo cambiar el estado')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetUser) return
    setBusy(true)
    setError('')
    const res = await fetch(`/api/users/${resetUser.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    })
    if (res.ok) {
      setResetUser(null)
      setNewPass('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al resetear')
    }
    setBusy(false)
  }

  const counts = {
    total: initialUsers.length,
    activos: initialUsers.filter((u) => u.active).length,
    admins: initialUsers.filter((u) => u.role === 'ADMINISTRADOR').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-pulse-red" /> Gestión de Usuarios
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Administración de cuentas, roles y accesos</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm font-bold uppercase tracking-wide">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total usuarios', value: counts.total, color: 'text-white' },
          { label: 'Activos', value: counts.activos, color: 'text-status-ok' },
          { label: 'Administradores', value: counts.admins, color: 'text-pulse-red' },
        ].map((c) => (
          <div key={c.label} className="card text-center">
            <p className={cn('font-rajdhani font-bold text-4xl', c.color)}>{c.value}</p>
            <p className="text-xs text-[#666] mt-1 uppercase tracking-wider">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm
                       placeholder-[#555] focus:outline-none focus:border-pulse-red transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm
                     focus:outline-none focus:border-pulse-red"
        >
          <option value="TODOS">Todos los roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm
                     focus:outline-none focus:border-pulse-red"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Nombre</th>
                <th className="px-5 py-3 text-left font-medium">Email</th>
                <th className="px-5 py-3 text-left font-medium">Rol</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
                <th className="px-5 py-3 text-left font-medium">Última sesión</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-[#555]">Sin resultados</td></tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-border-dark/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-pulse-red/15 border border-pulse-red/25 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-pulse-red">
                          {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <span className="font-medium text-white">
                        {u.name}
                        {u.id === currentUserId && <span className="text-xs text-[#555] ml-1">(tú)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#999] font-mono text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', roleBadge(u.role))}>
                      {u.role === 'ADMINISTRADOR' && <Shield className="w-3 h-3" />}
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                      u.active ? 'bg-status-ok/10 text-status-ok' : 'bg-[#3A1212] text-[#A04545]'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', u.active ? 'bg-status-ok' : 'bg-[#A04545]')} />
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#666] font-mono">{formatLastLogin(u.lastLoginAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} title="Editar"
                        className="p-1.5 rounded-lg text-[#888] hover:bg-border-dark hover:text-white transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setResetUser(u); setNewPass(''); setError('') }} title="Resetear contraseña"
                        className="p-1.5 rounded-lg text-[#888] hover:bg-border-dark hover:text-status-warn transition-colors">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleActive(u)} title={u.active ? 'Desactivar' : 'Activar'}
                        className={cn('p-1.5 rounded-lg hover:bg-border-dark transition-colors',
                          u.active ? 'text-[#888] hover:text-pulse-red' : 'text-status-ok')}>
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card border border-border-dark shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editing ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#666] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#ccc] mb-1.5">Nombre completo</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm
                             focus:outline-none focus:border-pulse-red transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ccc] mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm
                             focus:outline-none focus:border-pulse-red transition-colors" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Contraseña</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required minLength={8} placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm
                               placeholder-[#555] focus:outline-none focus:border-pulse-red transition-colors" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Rol</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm
                               focus:outline-none focus:border-pulse-red">
                    {ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Planta</label>
                  <select value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm
                               focus:outline-none focus:border-pulse-red">
                    <option value="">Sin asignar</option>
                    {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm card border border-border-dark shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-status-warn" /> Resetear contraseña
              </h2>
              <button onClick={() => setResetUser(null)} className="text-[#666] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#666] mb-4">
              Nueva contraseña para <span className="text-white font-medium">{resetUser.name}</span>
            </p>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                required minLength={8} placeholder="Mínimo 8 caracteres" autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm
                           placeholder-[#555] focus:outline-none focus:border-pulse-red transition-colors" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetUser(null)} className="btn-secondary flex-1 justify-center text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resetear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
