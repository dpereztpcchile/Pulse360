import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'PULSE 360 — Smart Plant Platform',
  description: 'Plataforma inteligente de gestión de planta industrial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="font-rajdhani antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
