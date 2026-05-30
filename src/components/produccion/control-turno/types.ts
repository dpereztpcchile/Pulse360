import type { Estado } from './ui'

export interface BatchDTO {
  id: string
  numeroBatch: number
  horaInicio: string | null
  horaTermino: string | null
  kgBatch: number
  duracionMinutos: number | null
  observacion: string | null
  estado: Estado
}

export interface RegistroDTO {
  id: string
  sku: string | null
  productoNombre: string
  dotacion: number | null
  kgPlan: number
  kgReal: number | null
  rentapacks: number | null
  pesoUnitarioKg: number | null
  rendTeoricoPorc: number | null
  estado: Estado
  horaInicio: string | null
  horaTermino: string | null
  observaciones: string | null
  batches: BatchDTO[]
}

export interface ActionPayload {
  action?: 'iniciar' | 'terminar'
  dotacion?: number | null
  kgReal?: number | null
  rentapacks?: number | null
  pesoUnitarioKg?: number | null
  observaciones?: string | null
}
