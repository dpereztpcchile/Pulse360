// PULSE 360 — No Conformidades: listas fijas extraídas de "SEGUIMIENTO NC.xlsx"
// (hoja "LISTAS DE DATOS"). Se usan para validar el import y para los
// selectores/filtros de la UI (Carga de archivos, Indicadores).

/** Productos cárnicos + insumos que aparecen en la columna PRODUCTO del Excel. */
export const NC_PRODUCTOS = [
  'POSTA NEGRA SIN TAPA', 'POSTA NEGRA CON TAPA', 'GANSO SIN PLATINA', 'GANSO CON PLATINA',
  'FILETE SIN CORDON', 'FILETE CON CORDON', 'POSTA ROSADA', 'POSTA PALETA', 'POLLO GANSO',
  'LOMO VETADO', 'LOMO CENTRO', 'LOMO LISO', 'ASIENTO', 'BATIDO MILANESAS', 'FILM MOLIDA',
  'COGOTE REFRESH', 'BANDEJAS H38', 'MILANESA CERDO', 'MILANESA VACUNO', 'TRIMING',
  'BANDEJA F40', 'FILM DESGRASADOS', 'ETIQUETAS 4%', 'ETIQUETAS 7%', 'ETIQUETAS 10%',
  'GANSO REFRESH', 'DESPUNTE 4%', 'ANTIOXIDANTE CMD', 'RECORTE MAGRO', 'FILM BISTEC',
  'DETERGENTE', 'BOLSA FUELLE AZUL', 'BOLSA FUELLE TRANS.', 'FILM SKIN PACK', 'MOLIDA 4% 500',
  'PAPEL CERESINADO', 'DESPUNTE 7%', 'BANDEJA F50', 'HEMOGLOBINA C', 'MOLIDA 10% 250',
  'DELANTERO REFRESH', 'TARTAR ASIENTO', 'ACIDO LACTICO', 'ALBONDIGA', 'HAMBURGUESA',
  'P.NEGRA AL ROJO', 'GANSO AL ROJO', 'STICKERS SIN ADITIVO', 'STICKERS SMASH',
  'ETIQUETA 4% 500', 'RECORTES Y TROZOS', 'PANKO', '4% S/A', 'ETIQUETA B. ASIENTO',
  'ETIQUETA ESCALOPA G.', 'ETIQUETA LOMO LISO S.', 'FILM DEBANADERA', 'PULPA REFRESH',
  'ALBONDIGA SISA', 'MANUFACTURA D.',
] as const

/** Motivos/razón de la NC (columna RAZON). */
export const NC_RAZONES = [
  'DFD (PH ALTO)', 'CAIDA A PISO', 'MAL OLOR', 'VIDA UTIL', 'MAL BOBINADO', 'CONTAMINACIÓN',
  'PERFORACIÓN', 'PROD. CAMBIADO', 'SOBRANTE', 'DEFORMIDADES', 'ESTRIAS', 'DEFECTUOSA',
  'ABCESO', 'REVISION SAG', 'EXCESO GRASA', 'EXCEDE T°', 'PRESENCIA HUESO', 'FUERA ESTANDAR',
  'OPERACIONAL', 'CAJAS QUEMADAS',
] as const

/** Proveedores conocidos (columna PROOVEDOR). La lista del Excel es acotada; se
 *  permite texto libre en el import por si aparecen proveedores nuevos. */
export const NC_PROVEEDORES = ['MINERVA FOODS', 'JBS', 'FRIGON'] as const

// Productos que son insumos de envase/embalaje, no producto cárnico.
// Se usa para el filtro opcional "excluir insumos de envase" en Indicadores.
// (Re-exportado también desde lib/utils.ts para compatibilidad con componentes existentes.)
export const NC_PRODUCTOS_ENVASE = new Set<string>([
  'BANDEJA F40', 'BANDEJA F50', 'BANDEJAS H38', 'ETIQUETA B. ASIENTO', 'ETIQUETA ESCALOPA G.',
  'ETIQUETA LOMO LISO S.', 'ETIQUETAS 10%', 'ETIQUETAS 4%', 'ETIQUETAS 7%', 'FILM BISTEC',
  'FILM DEBANADERA', 'FILM DESGRASADOS', 'FILM MOLIDA', 'FILM SKIN PACK', 'PAPEL CERESINADO',
  'STICKERS SIN ADITIVO', 'STICKERS SMASH', 'DETERGENTE', 'BOLSA FUELLE AZUL', 'BOLSA FUELLE TRANS.',
  'ACIDO LACTICO', 'ANTIOXIDANTE CMD', 'HEMOGLOBINA C', 'ETIQUETA 4% 500',
])

/** True si el producto de la NC es un insumo de envase/embalaje (no producto cárnico). */
export function ncEsInsumoEnvase(producto: string) {
  return NC_PRODUCTOS_ENVASE.has(producto.trim().toUpperCase())
}

// ── Mapeo de texto del Excel → valores de los enums Prisma ──
// El Excel usa texto libre con acentos/variantes; se normaliza a los enums NcDestino/NcEstado/NcResponsable.

/** DESTINO del Excel → enum NcDestino. Variantes no reconocidas → 'OTRO'. */
export function mapDestino(raw: string | null | undefined): 'VENTA_A_TERCEROS' | 'DECOMISO' | 'DEVOLUCION' | 'RETENIDO' | 'OTRO' {
  const v = (raw ?? '').trim().toUpperCase()
  if (v === 'VENTA A TERCEROS') return 'VENTA_A_TERCEROS'
  if (v === 'DECOMISO') return 'DECOMISO'
  if (v === 'DEVOLUCIÓN' || v === 'DEVOLUCION') return 'DEVOLUCION'
  if (v === 'RETENIDO') return 'RETENIDO'
  return 'OTRO' // p.ej. "PRUEBA DESAROLLO" u otros casos no contemplados
}

/** ESTADO NC del Excel → enum NcEstado. Devuelve null si está vacío o no reconocido. */
export function mapEstadoNc(raw: string | null | undefined): 'VENDIDO' | 'TRANSFERIDA' | 'D_CHILEMINK' | 'STANBY' | null {
  const v = (raw ?? '').trim().toUpperCase()
  if (v === 'VENDIDO') return 'VENDIDO'
  if (v === 'TRANSFERIDA') return 'TRANSFERIDA'
  if (v === 'D. CHILEMINK' || v === 'D.CHILEMINK' || v === 'D CHILEMINK') return 'D_CHILEMINK'
  if (v === 'STANBY' || v === 'STAND BY' || v === 'STANDBY') return 'STANBY'
  return null // incluye "NO REGISTRADA" y vacío
}

/** RESPONSABLE del Excel → enum NcResponsable. Devuelve null si está vacío o no reconocido. */
export function mapResponsable(raw: string | null | undefined): 'PROVEEDOR' | 'PLANTA' | null {
  const v = (raw ?? '').trim().toUpperCase()
  if (v === 'PROVEEDOR') return 'PROVEEDOR'
  if (v === 'PLANTA') return 'PLANTA'
  return null // incluye "FRIGOBUIN" y otras variantes no soportadas por el modelo actual
}

/** RECLAMO PROVEEDOR del Excel ("SI"/"NO") → booleano "gestionado".
 *  "SI" significa que hay coordinación con el proveedor para devolución del dinero:
 *  la NC queda excluida de todos los indicadores pero se mantiene en el histórico. */
export function mapGestionado(raw: string | null | undefined): boolean {
  return (raw ?? '').trim().toUpperCase() === 'SI'
}
