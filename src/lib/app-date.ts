/**
 * Fecha "de hoy" que usa la app.
 *
 * Modo DEMO: si la variable de entorno DEMO_DATE está definida (formato
 * YYYY-MM-DD), la app la trata como "hoy" en todas las vistas que filtran
 * por el día actual. Así el demo siempre muestra los documentos cargados
 * de esa fecha, sin importar el día real del calendario.
 *
 * En producción real basta con dejar DEMO_DATE sin definir.
 */
export function appToday(): string {
  const demo = process.env.DEMO_DATE
  if (demo && /^\d{4}-\d{2}-\d{2}$/.test(demo.trim())) return demo.trim()
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Indica si la app corre en modo demo (DEMO_DATE definida). */
export function isDemoMode(): boolean {
  const demo = process.env.DEMO_DATE
  return !!demo && /^\d{4}-\d{2}-\d{2}$/.test(demo.trim())
}
