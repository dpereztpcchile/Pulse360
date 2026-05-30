'use client'

import { useState, useCallback } from 'react'

/** Formatea un par de fechas YYYY-MM-DD a "dd/mm/yyyy – dd/mm/yyyy". */
export function fmtPeriod(from: string, to: string): string {
  const f = fmtOne(from)
  const t = fmtOne(to)
  if (!f && !t) return '—'
  return `${f} – ${t}`
}

function fmtOne(s: string): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return s
  return `${d}/${m}/${y}`
}

/** Maneja el estado "busy" de una exportación (sync o async). */
export function useReportExport() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (fn: () => void | Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      console.error('Error al exportar:', e)
    } finally {
      setBusy(false)
    }
  }, [])
  return { busy, run }
}
