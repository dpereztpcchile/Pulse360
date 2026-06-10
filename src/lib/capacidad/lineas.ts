// PULSE 360 — Capacidad: clasificación de productos a línea.
// La capacidad ya NO vive aquí: es la BD (modelos Linea/Turno/HorarioDia/ConfigProductividad)
// vía el servicio `@/lib/capacidad`. Este archivo solo mapea un producto a su línea.

/** Mapea un producto a la línea (por nombre en BD) que lo procesa, para la demanda real. */
export function lineaDeProducto(producto: string): string {
  const p = (producto || '').toUpperCase()
  if (p.includes('MOLIDA')) return 'MOLIENDA'
  // Cortes (Bistec, Escalopa, Cubos, etc.) → Carnicería
  return 'CARNICERIA'
}
