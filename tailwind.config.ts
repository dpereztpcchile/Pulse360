import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        sans: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        // ─────────────────────────────────────────────────────────
        // Tema "Luz Diurna" — paleta de superficies y texto, resuelta
        // vía variables CSS (ver globals.css) para que el toggle
        // Dark/Light del Header repinte TODA la app (excepto
        // /tablet/*) con un solo cambio de clase en <html>.
        // Se mantienen los mismos nombres de token ya usados en todo
        // el código (bg-dark, card-dark, border-dark, etc.) para que
        // las clases existentes se repinten automáticamente.
        // ─────────────────────────────────────────────────────────
        'bg-dark': 'var(--bg)',        // BG  — fondo general de página
        'card-dark': 'var(--card)',    // CRD — fondo de tarjetas/paneles
        'border-dark': 'var(--border)',// Borde hairline
        'nav-dark': 'var(--nav)',      // NAV — fondo del sidebar
        'top-dark': 'var(--top)',      // TOP — fondo del header superior

        // Legacy (sin uso activo, se conservan por compatibilidad)
        'bg-light': '#F5F5F5',
        'card-light': '#FFFFFF',
        'text-light': '#111111',

        // Marca (no cambia entre temas)
        'pulse-red': '#CC0000',
        'pulse-red-hover': '#E30613',
        'pulse-maroon': '#7A2021', // AC2 — acento secundario

        // Estados (no cambian entre temas)
        'status-ok': '#1C9A4B',
        'status-warn': '#C98A00',
        'status-stop': '#CC0000',

        // Texto — 4 niveles semánticos vía variables CSS, para
        // reemplazar los grises/blancos sueltos (text-white,
        // text-[#666], text-[#999], text-[#555], etc.)
        ink: 'var(--text-primary)',     // TXT — texto principal (antes text-white)
        'ink-2': 'var(--text-strong)',  // Texto secundario prominente (antes #ccc/#ddd)
        muted: 'var(--text-secondary)', // MUT — texto secundario/captions (antes #666/#999/#888/#777)
        'muted-2': 'var(--text-tertiary)', // Texto más tenue (antes #555/#444/#333/#aaa)
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
