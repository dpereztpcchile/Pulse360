'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Activity, BarChart3, Eye, EyeOff, Loader2, AlertCircle, Lock } from 'lucide-react'

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 60
const LOCK_KEY = 'pulse360_lock'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockRemaining, setLockRemaining] = useState(0)

  // Restaurar estado de bloqueo al montar
  useEffect(() => {
    const stored = localStorage.getItem(LOCK_KEY)
    if (stored) {
      const until = parseInt(stored, 10)
      if (until > Date.now()) {
        setLockRemaining(Math.ceil((until - Date.now()) / 1000))
      } else {
        localStorage.removeItem(LOCK_KEY)
      }
    }
  }, [])

  // Cuenta regresiva del bloqueo
  useEffect(() => {
    if (lockRemaining <= 0) return
    const id = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(LOCK_KEY)
          setAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [lockRemaining])

  const isLocked = lockRemaining > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    })

    if (result?.error) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_SECONDS * 1000
        localStorage.setItem(LOCK_KEY, String(until))
        setLockRemaining(LOCK_SECONDS)
        setError(`Demasiados intentos fallidos. Cuenta bloqueada por ${LOCK_SECONDS} segundos.`)
      } else {
        setError(`Email o contraseña incorrectos (${newAttempts}/${MAX_ATTEMPTS} intentos)`)
      }
      setLoading(false)
    } else {
      localStorage.removeItem(LOCK_KEY)
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      {/* Fondo con grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#CC0000 1px, transparent 1px),
                            linear-gradient(90deg, #CC0000 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
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

        {/* Card de login */}
        <div className="card border border-border-dark shadow-2xl shadow-black/50">
          <h2 className="text-xl font-semibold text-white mb-1">Iniciar Sesión</h2>
          <p className="text-sm text-[#666] mb-6">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className={`flex items-center gap-2 p-3 mb-4 rounded-lg text-sm ${
              isLocked
                ? 'bg-pulse-red/15 border border-pulse-red/30 text-pulse-red'
                : 'bg-pulse-red/10 border border-pulse-red/20 text-pulse-red'
            }`}>
              {isLocked ? <Lock className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {error}
            </div>
          )}

          {isLocked && (
            <div className="flex items-center justify-center gap-2 p-4 mb-4 rounded-lg bg-bg-dark border border-border-dark">
              <Lock className="w-5 h-5 text-pulse-red" />
              <span className="text-2xl font-rajdhani font-bold text-pulse-red tabular-nums">
                {lockRemaining}s
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#ccc] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLocked}
                placeholder="usuario@pulse360.cl"
                className="w-full px-4 py-2.5 rounded-lg bg-card-dark border border-border-dark
                           text-white placeholder-[#555] text-sm
                           focus:outline-none focus:border-pulse-red focus:ring-1 focus:ring-pulse-red
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ccc] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg bg-card-dark border border-border-dark
                             text-white placeholder-[#555] text-sm
                             focus:outline-none focus:border-pulse-red focus:ring-1 focus:ring-pulse-red
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full justify-center py-3 mt-2 inline-flex items-center gap-2 rounded-lg
                         bg-pulse-red hover:bg-pulse-red-hover text-white font-bold uppercase tracking-wider
                         transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Autenticando...
                </>
              ) : isLocked ? (
                'Bloqueado'
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Credenciales de demo */}
          <div className="mt-6 pt-5 border-t border-border-dark">
            <p className="text-xs text-[#555] mb-3 font-medium uppercase tracking-wider">
              Credenciales de demo
            </p>
            <div className="space-y-1.5">
              {[
                { label: 'Administrador', email: 'admin@pulse360.cl', pass: 'Pulse360#Admin', color: 'text-pulse-red' },
                { label: 'Supervisor', email: 'supervisor1@pulse360.cl', pass: 'Pulse360#2024', color: 'text-status-warn' },
                { label: 'Operador', email: 'operador1@pulse360.cl', pass: 'Pulse360#2024', color: 'text-[#999]' },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  disabled={isLocked}
                  onClick={() => { setEmail(u.email); setPassword(u.pass) }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-border-dark transition-colors
                             flex items-center justify-between group disabled:opacity-50"
                >
                  <span className={`text-xs font-semibold ${u.color}`}>{u.label}</span>
                  <span className="text-xs text-[#555] group-hover:text-[#888] font-mono">{u.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#444] mt-6">
          © 2025 PULSE 360 · Smart Plant Platform
        </p>
      </div>
    </div>
  )
}
