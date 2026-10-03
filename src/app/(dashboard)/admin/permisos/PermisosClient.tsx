'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Save, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Info } from 'lucide-react'
import { cn, getRoleLabel, getRoleBadgeColor } from '@/lib/utils'

interface ModuleDef { key: string; label: string; href: string }

interface Props {
  roles: string[]
  modules: ModuleDef[]
  initialMatrix: Record<string, Record<string, boolean>>
}

export function PermisosClient({ roles, modules, initialMatrix }: Props) {
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
    <div className="space-y-6">
      <div>
        <Link href="/configuracion" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Configuración
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-pulse-red" /> Permisos por rol
        </h1>
        <p className="text-sm text-[#666] mt-0.5">
          Define a qué módulos puede acceder cada rol. Los cambios se aplican la próxima vez que cada usuario inicie sesión.
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Dashboard</strong> es visible para todos los roles y no se gestiona aquí.
          <strong className="ml-1">Administrador</strong> tiene siempre acceso total a todos los módulos, incluyendo Usuarios y Configuración.
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
