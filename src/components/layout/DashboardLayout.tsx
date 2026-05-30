'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

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
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
