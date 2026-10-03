'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Activity, BarChart3, Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react'

export default function CambiarClavePage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser distinta de la actual')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/me/cambiar-clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cambiar la contraseña')
        setLoading(false)
        return
      }
      // Refresca la sesión (JWT) para que mustChangePassword quede en false
      await update({ mustChangePassword: false })
      router.push('/dashboard')
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-pulse-red" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#CC0000 1px, transparent 1px),
                            linear-gradient(90deg, #CC0000 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <Activity className="absolute w-7 h-7 text-pulse-red opacity-80" strokeWidth={2.5} />
                <BarChart3 className="absolute w-10 h-10 text-white opacity-20" />
              </div>
              <div className="text-5xl font-bold leading-none tracking-wider">
                <span className="text-white">PULSE</span>
                <span className="text-pulse-red">360</span>
              </div>
            </div>
            <div className="text-sm text-[#666] tracking-[0.4em] uppercase font-medium">
              Smart Plant Platform
            </div>
          </div>
        </div>

        <div className="card border border-border-dark shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-pulse-red" />
            <h2 className="text-xl font-semibold text-white">Cambia tu contraseña</h2>
          </div>
          <p className="text-sm text-[#666] mb-6">
            {session?.user?.name ? `Hola, ${session.user.name}. ` : ''}
            Por seguridad, debes definir una nueva contraseña antes de continuar.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#ccc] mb-1.5">
                Contraseña actual
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="La contraseña que te entregaron"
                className="w-full px-4 py-2.5 rounded-lg bg-card-dark border border-border-dark
                           text-white placeholder-[#555] text-sm
                           focus:outline-none focus:border-pulse-red focus:ring-1 focus:ring-pulse-red
                           transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ccc] mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-card-dark border border-border-dark
                             text-white placeholder-[#555] text-sm
                             focus:outline-none focus:border-pulse-red focus:ring-1 focus:ring-pulse-red
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ccc] mb-1.5">
                Confirmar nueva contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repite la nueva contraseña"
                className="w-full px-4 py-2.5 rounded-lg bg-card-dark border border-border-dark
                           text-white placeholder-[#555] text-sm
                           focus:outline-none focus:border-pulse-red focus:ring-1 focus:ring-pulse-red
                           transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg
                         bg-pulse-red hover:bg-pulse-red/90 text-white font-semibold text-sm
                         transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar y continuar'
              )}
            </button>
          </form>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-center text-xs text-[#555] hover:text-[#888] mt-5"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
