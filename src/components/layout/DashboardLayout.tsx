'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { EnConstruccion } from './EnConstruccion'
import { isModuleBlocked } from '@/lib/blocked-modules'
import { cn } from '@/lib/utils'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const blocked = isModuleBlocked(pathname)

  return (
    <div className="min-h-screen bg-bg-dark">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarCollapsed={collapsed} />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          collapsed ? 'pl-16' : 'pl-64'
        )}
      >
        <div className="p-6">{blocked ? <EnConstruccion /> : children}</div>
      </main>
    </div>
  )
}
