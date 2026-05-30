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
        // Dark mode palette
        'bg-dark': '#0D0D0D',
        'card-dark': '#1A1A1A',
        'border-dark': '#2A2A2A',
        // Light mode palette
        'bg-light': '#F5F5F5',
        'card-light': '#FFFFFF',
        'text-light': '#111111',
        // Brand
        'pulse-red': '#CC0000',
        'pulse-red-hover': '#E30613',
        // Status
        'status-ok': '#22C55E',
        'status-warn': '#F59E0B',
        'status-stop': '#CC0000',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
