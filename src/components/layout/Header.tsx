'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, LogOut, User, Sun, Moon } from 'lucide-react'
import { cn, getRoleLabel, getRoleBadgeColor } from '@/lib/utils'

interface HeaderProps {
  sidebarCollapsed: boolean
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { data: session } = useSession()
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      setTime(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }))
    }
    updateClock()
    const id = setInterval(updateClock, 1000)
    return () => clearInterval(id)
  }, [])

  function toggleTheme() {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      setDarkMode(false)
    } else {
      html.classList.add('dark')
      setDarkMode(true)
    }
  }

  const role = session?.user?.role ?? ''

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 z-30',
        'bg-[#050505] border-b border-border-dark',
        'flex items-center justify-between px-5 gap-4',
        'transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      {/* Empresa / planta */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-[#666] uppercase tracking-wider font-medium">THE PROTEIN COMPANY</span>
          <span className="text-sm font-semibold text-white leading-tight">Planta Carnes - Paine</span>
        </div>
      </div>

      {/* Reloj + controles + usuario */}
      <div className="flex items-center gap-4">
        {/* Reloj */}
        <div className="text-right hidden sm:block">
          <div className="font-rajdhani font-bold text-lg text-white leading-none tabular-nums">
            {time}
          </div>
          <div className="text-xs text-[#666] capitalize">{date}</div>
        </div>

        <div className="w-px h-8 bg-border-dark" />

        {/* Toggle tema */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[#666] hover:bg-border-dark hover:text-white transition-colors"
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Menú de usuario */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-border-dark transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-pulse-red/20 border border-pulse-red/30 flex items-center justify-center">
              <User className="w-4 h-4 text-pulse-red" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-white leading-tight">
                {session?.user?.name?.split(' ')[0] ?? 'Usuario'}
              </div>
              <div className={cn('text-xs font-medium', getRoleBadgeColor(role).includes('pulse-red') ? 'text-pulse-red' : 'text-[#999]')}>
                {getRoleLabel(role)}
              </div>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-[#666] transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card-dark border border-border-dark rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-border-dark">
                  <p className="text-sm font-semibold text-white">{session?.user?.name}</p>
                  <p className="text-xs text-[#666] mt-0.5">{session?.user?.email}</p>
                  <span className={cn('inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-semibold', getRoleBadgeColor(role))}>
                    {getRoleLabel(role)}
                  </span>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#999]
                               hover:bg-pulse-red/10 hover:text-pulse-red transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
