import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'PULSE 360 — Smart Plant Platform',
  description: 'Plataforma inteligente de gestión de planta industrial',
}

// Aplica la preferencia de tema guardada (si la hay) antes del primer
// paint, para evitar un parpadeo claro→oscuro al cargar la página.
// Por defecto el tema es "Luz Diurna" (claro); el modo oscuro es opcional
// vía el toggle del Header y se recuerda en localStorage.
const THEME_INIT_SCRIPT = `
  try {
    if (localStorage.getItem('pulse360-theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-rajdhani antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
