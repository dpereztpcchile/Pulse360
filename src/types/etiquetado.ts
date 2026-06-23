// src/types/etiquetado.ts
// Tipos compartidos para el módulo Control de Etiquetado

export type EstadoEtiquetado =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'AUTORIZADO'
  | 'VERIFICADO'
  | 'RECHAZADO'

export type RolFirma = 'MAQUINISTA' | 'CALIDAD' | 'SUPERVISOR' | 'VERIFICADOR'

export type ResultadoItem = 'C' | 'NC' | 'C_OBS'

// ─── Checklist ────────────────────────────────────────────────────────────────
export const CHECKLIST_ITEMS = [
  { key: 'nombre_producto',           nombre: 'Nombre producto' },
  { key: 'lote',                      nombre: 'Lote' },
  { key: 'condiciones_almacenamiento',nombre: 'Condiciones de almacenamiento' },
  { key: 'ingredientes',              nombre: 'Ingredientes' },
  { key: 'fecha_elaboracion',         nombre: 'Fecha de elaboración' },
  { key: 'fecha_vencimiento',         nombre: 'Fecha de vencimiento' },
  { key: 'fecha_faena',               nombre: 'Fecha Faena' },
  { key: 'frigorifico_origen_sif',    nombre: 'Frigorífico, origen, SIF' },
  { key: 'info_nutricional',          nombre: 'Información nutricional' },
  { key: 'resolucion_sanitaria',      nombre: 'Resolución Sanitaria' },
  { key: 'codigo_sap_sku',            nombre: 'Código SAP / SKU' },
  { key: 'codigo_barras',             nombre: 'Código de barras legible' },
  { key: 'precio',                    nombre: 'Precio' },
  { key: 'peso_contenido',            nombre: 'Peso / Contenido neto' },
  { key: 'cabezal_1',                 nombre: 'Cabezal 1 — puntos muertos' },
  { key: 'cabezal_2',                 nombre: 'Cabezal 2 — puntos muertos' },
] as const

export type ChecklistKey = typeof CHECKLIST_ITEMS[number]['key']

// ─── Respuesta del análisis IA ────────────────────────────────────────────────
export interface AnalisisIAResult {
  confianza: number
  camposExtraidos: {
    producto?: string
    lote?: string
    fechaElaboracion?: string
    fechaVencimiento?: string
    fechaFaena?: string
    frigorifico?: string
    origen?: string
    precio?: string
    codigoBarras?: string
    resolucionSanitaria?: string
  }
  checklist: Array<{
    key: ChecklistKey
    resultado: ResultadoItem
    nota: string
  }>
  observaciones?: string
  tokensUsados?: number
}

// ─── DTO de creación ──────────────────────────────────────────────────────────
export interface CreateRegistroDTO {
  lineaProceso: string
  producto: string
  lote: string
  fechaElaboracion: string  // ISO string
  fechaVencimiento: string
  fechaFaena?: string
  frigorifico?: string
  origen?: string
  precio?: number
  maquinista: string
}

// ─── Registro completo (respuesta API) ───────────────────────────────────────
export interface RegistroEtiquetadoCompleto {
  id: string
  codigo: string
  estado: EstadoEtiquetado
  fecha: string
  lineaProceso: string
  producto: string
  lote: string
  fechaElaboracion: string
  fechaVencimiento: string
  fechaFaena?: string
  frigorifico?: string
  origen?: string
  precio?: number
  maquinista: string
  observaciones?: string
  motivoRechazo?: string
  fotos: Array<{
    id: string
    tipo: 'ETIQUETA_PT' | 'MATERIA_PRIMA'
    url: string
    timestamp: string
    operador: string
  }>
  checklist: Array<{
    itemKey: string
    itemNombre: string
    resultado: ResultadoItem
    resultadoIA?: ResultadoItem
    notaIA?: string
    override: boolean
    notaManual?: string
    orden: number
  }>
  analisisIA?: {
    confianza: number
    procesadoEn: string
    camposExtraidos: Record<string, string>
    itemsAprobados: number
    itemsNC: number
  }
  firmas: Array<{
    rol: RolFirma
    nombreUsuario: string
    firmadoEn: string
    observacion?: string
    esRechazo: boolean
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function puedeAutorizar(
  registro: RegistroEtiquetadoCompleto,
  rol: RolFirma
): boolean {
  if (registro.estado !== 'EN_REVISION') return false
  if (rol !== 'CALIDAD' && rol !== 'SUPERVISOR') return false
  return !registro.firmas.some(f => f.rol === rol && !f.esRechazo)
}

export function puedeVerificar(
  registro: RegistroEtiquetadoCompleto,
  rol: RolFirma
): boolean {
  if (rol !== 'VERIFICADOR') return false
  if (registro.estado !== 'AUTORIZADO') return false
  return !registro.firmas.some(f => f.rol === 'VERIFICADOR')
}

export function calcularNuevoEstado(
  registro: RegistroEtiquetadoCompleto
): EstadoEtiquetado {
  const firmas = registro.firmas.filter(f => !f.esRechazo)
  const tieneCalidad    = firmas.some(f => f.rol === 'CALIDAD')
  const tieneSuperviser = firmas.some(f => f.rol === 'SUPERVISOR')
  const tieneVerif      = firmas.some(f => f.rol === 'VERIFICADOR')

  if (tieneVerif) return 'VERIFICADO'
  if (tieneCalidad && tieneSuperviser) return 'AUTORIZADO'
  return 'EN_REVISION'
}

// ─── Generador de código único ─────────────────────────────────────────────
export function generarCodigoRegistro(fecha: Date, secuencia: number): string {
  const yyyy = fecha.getFullYear()
  const mm   = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd   = String(fecha.getDate()).padStart(2, '0')
  const seq  = String(secuencia).padStart(4, '0')
  return `ETQ-${yyyy}${mm}${dd}-${seq}`
}
