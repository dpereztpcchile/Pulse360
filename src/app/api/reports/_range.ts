/** Helpers compartidos para parsear el rango de fechas de los endpoints de reportes. */

/** Parsea ?from=YYYY-MM-DD&to=YYYY-MM-DD. Si faltan, usa los últimos 30 días. */
export function parseRange(searchParams: URLSearchParams): { from: Date; to: Date } {
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  const to = toStr ? new Date(toStr + 'T23:59:59') : new Date()
  let from: Date
  if (fromStr) {
    from = new Date(fromStr + 'T00:00:00')
  } else {
    from = new Date(to)
    from.setDate(from.getDate() - 29)
    from.setHours(0, 0, 0, 0)
  }

  // Normaliza orden si vienen invertidas.
  if (from > to) return { from: to, to: from }
  return { from, to }
}
