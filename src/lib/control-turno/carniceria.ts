// PULSE 360 — Carnicería: cálculos de productividad sobre materia prima bruta (Kg MP/HH).

/** Kg MP teórico = Pedido PT / % Rendimiento teórico. */
export function kgMPTeorico(kgPTPlan: number, rendTeorico: number): number {
  if (!rendTeorico || rendTeorico <= 0) return 0
  return kgPTPlan / (rendTeorico / 100)
}

/** Despunte teórico = MP teórico − Pedido PT. */
export function despunteTeorico(kgPTPlan: number, rendTeorico: number): number {
  return Math.max(0, kgMPTeorico(kgPTPlan, rendTeorico) - kgPTPlan)
}

/** Horas-hombre reales = (término − inicio) en horas × dotación. */
export function hhReales(horaInicio: Date | string | null, horaTermino: Date | string | null, dotacion: number): number {
  if (!horaInicio || !horaTermino) return 0
  const ms = new Date(horaTermino).getTime() - new Date(horaInicio).getTime()
  if (ms <= 0) return 0
  return (ms / 3_600_000) * (dotacion || 0)
}

export interface CorteDerivados {
  hhReales: number | null
  prodReal: number | null
  rendReal: number | null
}

/** Calcula HH reales, productividad real (Kg MP/HH) y % rendimiento real. */
export function computeDerivados(args: {
  horaInicio: Date | string | null
  horaTermino: Date | string | null
  kgMPReal: number | null
  kgPTReal: number | null
  dotacion: number
}): CorteDerivados {
  const hh = hhReales(args.horaInicio, args.horaTermino, args.dotacion)
  const prod = hh > 0 && args.kgMPReal != null ? args.kgMPReal / hh : null
  const rend = args.kgMPReal && args.kgMPReal > 0 && args.kgPTReal != null ? (args.kgPTReal / args.kgMPReal) * 100 : null
  return {
    hhReales: hh > 0 ? Math.round(hh * 100) / 100 : null,
    prodReal: prod != null ? Math.round(prod * 10) / 10 : null,
    rendReal: rend != null ? Math.round(rend * 10) / 10 : null,
  }
}

/** Color de productividad real vs objetivo (% del objetivo alcanzado). */
export function prodColor(prodReal: number | null, objetivo: number): string {
  if (prodReal == null || !objetivo) return '#999999'
  const ratio = (prodReal / objetivo) * 100
  if (ratio >= 95) return '#22C55E'
  if (ratio >= 80) return '#F59E0B'
  return '#CC0000'
}
