'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Save, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Info, User as UserIcon, RotateCcw } from 'lucide-react'
import { cn, getRoleLabel, getRoleBadgeColor } from '@/lib/utils'

interface ModuleDef { key: string; label: string; href: string }
interface UserRef { id: string; name: string; email: string; role: string }

interface Props {
  roles: string[]
  modules: ModuleDef[]
  initialMatrix: Record<string, Record<string, boolean>>
  users: UserRef[]
}

export function PermisosClient({ roles, modules, initialMatrix, users }: Props) {
  const [tab, setTab] = useState<'rol' | 'usuario'>('rol')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/configuracion" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Configuración
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-pulse-red" /> Permisos
        </h1>
        <p className="text-sm text-[#666] mt-0.5">
          Define a qué módulos puede acceder cada rol, y ajusta excepciones puntuales por usuario.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border-dark">
        <button
          onClick={() => setTab('rol')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'rol' ? 'border-pulse-red text-white' : 'border-transparent text-[#666] hover:text-white'
          )}
        >
          Por rol
        </button>
        <button
          onClick={() => setTab('usuario')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5',
            tab === 'usuario' ? 'border-pulse-red text-white' : 'border-transparent text-[#666] hover:text-white'
          )}
        >
          <UserIcon className="w-3.5 h-3.5" /> Por usuario
        </button>
      </div>

      {tab === 'rol' ? (
        <PorRolTab roles={roles} modules={modules} initialMatrix={initialMatrix} />
      ) : (
        <PorUsuarioTab modules={modules} users={users} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Pestaña "Por rol": matriz rol × módulo (comportamiento original)
// ═══════════════════════════════════════════════════════════
function PorRolTab({ roles, modules, initialMatrix }: {
  roles: string[]
  modules: ModuleDef[]
  initialMatrix: Record<string, Record<string, boolean>>
}) {
  const [matrix, setMatrix] = useState(initialMatrix)
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggle(role: string, moduleKey: string) {
    setMatrix((m) => ({
      ...m,
      [role]: { ...m[role], [moduleKey]: !m[role][moduleKey] },
    }))
    setDirty((d) => new Set(d).add(`${role}:${moduleKey}`))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const changes = Array.from(dirty).map((k) => {
        const [role, moduleKey] = k.split(':')
        return { role, moduleKey, allowed: matrix[role][moduleKey] }
      })
      if (changes.length === 0) { setSaved(true); return }

      const res = await fetch('/api/admin/permisos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al guardar'); return }
      setDirty(new Set())
      setSaved(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Dashboard</strong> es visible para todos los roles y no se gestiona aquí.
          <strong className="ml-1">Administrador</strong> tiene siempre acceso total a todos los módulos, incluyendo Usuarios y Configuración.
          Esta matriz define la base de cada rol; en la pestaña <strong>Por usuario</strong> puedes definir excepciones puntuales.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
              <th className="px-5 py-3 text-left sticky left-0 bg-card-dark">Módulo</th>
              {roles.map((role) => (
                <th key={role} className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getRoleBadgeColor(role))}>
                    {getRoleLabel(role)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            {modules.map((mod) => (
              <tr key={mod.key} className="hover:bg-border-dark/30 transition-colors">
                <td className="px-5 py-3.5 font-medium text-white sticky left-0 bg-card-dark">{mod.label}</td>
                {roles.map((role) => {
                  const checked = !!matrix[role]?.[mod.key]
                  const changed = dirty.has(`${role}:${mod.key}`)
                  return (
                    <td key={role} className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(role, mod.key)}
                        className={cn(
                          'relative w-10 h-5 rounded-full transition-colors inline-block align-middle',
                          checked ? 'bg-pulse-red' : 'bg-border-dark',
                          changed && 'ring-2 ring-offset-2 ring-offset-card-dark ring-pulse-red/50'
                        )}
                        title={`${getRoleLabel(role)} — ${mod.label}: ${checked ? 'permitido' : 'bloqueado'}`}
                      >
                        <span className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                          checked ? 'translate-x-5' : 'translate-x-0.5',
                        )} />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-status-ok">
            <CheckCircle2 className="w-4 h-4" /> Permisos guardados
          </span>
        )}
        {dirty.size > 0 && !saved && (
          <span className="text-xs text-[#666]">{dirty.size} cambio{dirty.size === 1 ? '' : 's'} sin guardar</span>
        )}
        <button
          onClick={save}
          disabled={saving || dirty.size === 0}
          className="btn-primary text-sm ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Pestaña "Por usuario": selector de usuario + overrides individuales
// Cada módulo tiene 3 estados: Hereda de rol / Forzado permitido / Forzado bloqueado
// ═══════════════════════════════════════════════════════════
type OverrideState = 'heredado' | 'permitido' | 'bloqueado'

interface UserPermData {
  role: string
  roleAllowed: string[]
  overrides: Record<string, boolean>
  isAdmin: boolean
}

function PorUsuarioTab({ modules, users }: { modules: ModuleDef[]; users: UserRef[] }) {
  const [selectedId, setSelectedId] = useState<string>(users[0]?.id ?? '')
  const [data, setData] = useState<UserPermData | null>(null)
  const [states, setStates] = useState<Record<string, OverrideState>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const selectedUser = users.find((u) => u.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) return
    setLoading(true); setError(''); setSaved(false)
    fetch(`/api/admin/permisos/usuario/${selectedId}`)
      .then((r) => r.json())
      .then((d: UserPermData & { error?: string }) => {
        if (d.error) { setError(d.error); return }
        setData(d)
        const next: Record<string, OverrideState> = {}
        for (const mod of modules) {
          if (mod.key in d.overrides) {
            next[mod.key] = d.overrides[mod.key] ? 'permitido' : 'bloqueado'
          } else {
            next[mod.key] = 'heredado'
          }
        }
        setStates(next)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  function cycle(moduleKey: string) {
    setStates((s) => {
      const current = s[moduleKey]
      const next: OverrideState = current === 'heredado' ? 'permitido' : current === 'permitido' ? 'bloqueado' : 'heredado'
      return { ...s, [moduleKey]: next }
    })
    setSaved(false)
  }

  async function save() {
    if (!selectedId || !data) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const changes = modules.map((mod) => {
        const state = states[mod.key]
        const allowed = state === 'heredado' ? null : state === 'permitido'
        return { moduleKey: mod.key, allowed }
      })
      const res = await fetch(`/api/admin/permisos/usuario/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al guardar'); return }
      setSaved(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  function resetAll() {
    const next: Record<string, OverrideState> = {}
    for (const mod of modules) next[mod.key] = 'heredado'
    setStates(next)
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Elige un usuario y haz clic sobre cada módulo para alternar entre <strong>Hereda de rol</strong>,{' '}
          <strong>Forzado permitido</strong> y <strong>Forzado bloqueado</strong>. Los overrides tienen prioridad
          sobre la matriz por rol y solo afectan a este usuario.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 max-w-sm">
          <label className="block text-xs font-medium text-[#999] uppercase tracking-wide mb-1.5">Usuario</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm
                       focus:outline-none focus:border-pulse-red focus:ring-1 focus:ring-pulse-red"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
            ))}
          </select>
        </div>
        {selectedUser && (
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-auto', getRoleBadgeColor(selectedUser.role))}>
            Rol: {getRoleLabel(selectedUser.role)}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {data?.isAdmin ? (
        <div className="card p-6 text-center text-sm text-[#666]">
          Este usuario es <strong className="text-white">Administrador</strong> y siempre tiene acceso total a todos los módulos.
          No se gestionan excepciones individuales para administradores.
        </div>
      ) : loading ? (
        <div className="card p-10 flex items-center justify-center text-[#666] text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando permisos...
        </div>
      ) : data ? (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Módulo</th>
                  <th className="px-4 py-3 text-center">Base (rol)</th>
                  <th className="px-4 py-3 text-center">Estado efectivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {modules.map((mod) => {
                  const roleHasIt = data.roleAllowed.includes(mod.key)
                  const state = states[mod.key] ?? 'heredado'
                  return (
                    <tr key={mod.key} className="hover:bg-border-dark/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-white">{mod.label}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          roleHasIt ? 'bg-status-ok/10 text-status-ok' : 'bg-[#444]/30 text-[#777]'
                        )}>
                          {roleHasIt ? 'Permitido' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => cycle(mod.key)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 min-w-[160px] justify-center transition-colors',
                            state === 'heredado' && 'bg-border-dark text-[#999] hover:bg-border-dark/70',
                            state === 'permitido' && 'bg-status-ok/15 text-status-ok border border-status-ok/30 hover:bg-status-ok/25',
                            state === 'bloqueado' && 'bg-pulse-red/15 text-pulse-red border border-pulse-red/30 hover:bg-pulse-red/25',
                          )}
                          title="Clic para cambiar"
                        >
                          {state === 'heredado' && `Hereda de rol (${roleHasIt ? 'permitido' : 'bloqueado'})`}
                          {state === 'permitido' && 'Forzado: permitido'}
                          {state === 'bloqueado' && 'Forzado: bloqueado'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-status-ok">
                <CheckCircle2 className="w-4 h-4" /> Permisos guardados
              </span>
            )}
            <button
              onClick={resetAll}
              className="text-xs text-[#666] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restablecer todo al rol
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary text-sm ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
