// PULSE 360 — Scheduler en proceso para el cierre diario de Carnicería a las 23:50.
// Se inicia desde instrumentation.ts (una vez por proceso del servidor).
import { cerrarDiaCarniceria } from './cierre-carniceria'

const CIERRE_HORA = 23
const CIERRE_MIN = 50

// Guarda global para no duplicar el timer (sobrevive a hot-reload en dev).
const g = globalThis as unknown as { __cierreSchedulerStarted?: boolean }

function msUntil(hour: number, min: number): number {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, min, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

function scheduleNext() {
  const delay = msUntil(CIERRE_HORA, CIERRE_MIN)
  setTimeout(async () => {
    try {
      const row = await cerrarDiaCarniceria(null)
      console.log(`[cierre-carniceria] ${row.fecha.toISOString().slice(0, 10)}: ${row.totalKgMPReal} kg MP real guardados`)
    } catch (e) {
      console.error('[cierre-carniceria] error:', e)
    }
    scheduleNext()
  }, delay)
}

export function startCierreScheduler() {
  if (g.__cierreSchedulerStarted) return
  g.__cierreSchedulerStarted = true
  scheduleNext()
  console.log('[cierre-carniceria] scheduler iniciado (cierre diario 23:50)')
}
