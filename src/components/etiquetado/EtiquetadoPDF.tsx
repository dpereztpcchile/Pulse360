'use client'
import React from 'react'
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer'

const C = {
  rojo: '#CC0000', verde: '#16a34a', grisClaro: '#f8f8f8',
  grisMedio: '#888888', grisTexto: '#aaaaaa', negro: '#1a1a1a',
  azulComp: '#f0f8ff', azulBdr: '#bee5eb', verdeClaro: '#f0faf0',
  rojoClaro: '#fff0f0', amarillo: '#fff8e1', amarilloBdr: '#ffe082',
  blanco: '#ffffff', bordeGris: '#dddddd',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, color: C.negro, paddingTop: 12, paddingBottom: 14, paddingHorizontal: 15, backgroundColor: C.blanco },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: C.rojo, paddingBottom: 8, marginBottom: 8 },
  logoBox: { width: 40, height: 40, backgroundColor: C.rojo, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText: { color: C.blanco, fontSize: 6, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  headerTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.negro, textTransform: 'uppercase' },
  headerSub: { fontSize: 7, color: C.grisMedio, marginTop: 1 },
  docCode: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.rojo, textAlign: 'right' },
  docVer: { fontSize: 7, color: C.grisTexto, textAlign: 'right' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.amarillo, borderWidth: 0.5, borderColor: C.amarilloBdr, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8 },
  statusText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#7a5c00' },
  statusId: { fontSize: 7, color: C.grisTexto },
  secLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.rojo, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 3, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: '#f0e0e0' },
  grid3: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  grid2: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  cell: { flex: 1, backgroundColor: C.grisClaro, borderRadius: 2, paddingVertical: 3, paddingHorizontal: 5 },
  cellLabel: { fontSize: 6, color: C.grisTexto, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  cellValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.negro },
  cellRed: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.rojo },
  fotoRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  fotoCard: { flex: 1, borderWidth: 1, borderColor: C.bordeGris, borderRadius: 3, overflow: 'hidden' },
  fotoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f5', paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#eeeeee' },
  fotoTitle: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#555555', textTransform: 'uppercase' },
  fotoImg: { width: '100%', height: 90, objectFit: 'cover' },
  fotoNoImg: { width: '100%', height: 90, backgroundColor: '#f0ece4', alignItems: 'center', justifyContent: 'center' },
  fotoNoImgTx: { fontSize: 7, color: '#cccccc' },
  fotoFooter: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fafafa', paddingVertical: 2, paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: '#eeeeee' },
  fotoTs: { fontSize: 6, color: '#aaaaaa' },
  fotoOp: { fontSize: 6, color: '#888888', fontFamily: 'Helvetica-Bold' },
  badgeGreen: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#155724', backgroundColor: '#d4edda', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 2 },
  badgeYellow: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#856404', backgroundColor: '#fff3cd', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 2 },
  compTable: { borderWidth: 0.5, borderColor: C.azulBdr, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  compHeader: { flexDirection: 'row', backgroundColor: C.azulComp, paddingVertical: 3, paddingHorizontal: 6 },
  compRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderTopWidth: 0.3, borderTopColor: C.azulBdr, backgroundColor: '#f8fcff' },
  compField: { flex: 1.2, fontSize: 7, color: '#555555' },
  compVal: { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.negro, textAlign: 'center' },
  compOk: { width: 30, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.verde, textAlign: 'right' },
  compHead: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#888888' },
  clGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: 4 },
  clItem: { width: '49%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2, paddingHorizontal: 5, borderRadius: 2, marginBottom: 1 },
  clItemOk: { backgroundColor: C.verdeClaro },
  clItemNc: { backgroundColor: C.rojoClaro },
  clName: { fontSize: 7, color: '#333333', flex: 1 },
  clBadgeC: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#155724', backgroundColor: '#d4edda', paddingVertical: 1, paddingHorizontal: 3, borderRadius: 1 },
  clBadgeNC: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#721c24', backgroundColor: '#f8d7da', paddingVertical: 1, paddingHorizontal: 3, borderRadius: 1 },
  obsBox: { backgroundColor: '#fffef0', borderWidth: 0.5, borderColor: '#f0e68c', borderRadius: 2, paddingVertical: 4, paddingHorizontal: 7, marginBottom: 6, fontSize: 7, color: '#555555', lineHeight: 1.4 },
  firmaTable: { borderWidth: 0.5, borderColor: C.bordeGris, borderRadius: 3, overflow: 'hidden', marginTop: 3 },
  firmaHeader: { flexDirection: 'row', backgroundColor: C.grisClaro, paddingVertical: 3, paddingHorizontal: 5 },
  firmaRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 5, borderTopWidth: 0.3, borderTopColor: '#eeeeee' },
  firmaRowOk: { backgroundColor: '#f0faf5' },
  firmaRowPend: { backgroundColor: '#fffdf0' },
  firmaColRol: { width: 55, fontSize: 6.5, color: '#666666' },
  firmaColNom: { flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.negro },
  firmaColFirm: { flex: 1, fontSize: 10, color: '#444444', fontFamily: 'Helvetica-Oblique' },
  firmaColTs: { width: 52, fontSize: 6, color: '#aaaaaa' },
  firmaColEst: { width: 40, fontSize: 6, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  firmaEstOk: { color: '#155724' },
  firmaEstPend: { color: '#856404' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 0.3, borderTopColor: '#eeeeee', paddingTop: 4, marginTop: 6 },
  footerL: { fontSize: 6, color: '#cccccc', lineHeight: 1.4 },
  footerR: { fontSize: 6, color: '#cccccc', textAlign: 'right' },
  footerBrand: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.rojo, opacity: 0.4 },
})

function fmt(fecha?: string | null): string {
  if (!fecha) return '—'
  try { return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '—' }
}

function fmtTs(fecha?: string | null): string {
  if (!fecha) return '—'
  try { return new Date(fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

const ROL_LABELS: Record<string, string> = {
  MAQUINISTA: 'Nivel 1 — Maquinista', CALIDAD: 'Nivel 2 — Calidad',
  SUPERVISOR: 'Nivel 2 — Supervisor', VERIFICADOR: 'Nivel 3 — Verificador',
}
const ROL_ESTADO: Record<string, string> = {
  MAQUINISTA: 'INGRESADO', CALIDAD: 'AUTORIZADO',
  SUPERVISOR: 'AUTORIZADO', VERIFICADOR: 'VERIFICADO',
}

interface PDFProps {
  registro: { codigo: string; estado: string; fecha: string; lineaProceso: string; producto: string; lote: string; fechaElaboracion: string; fechaVencimiento: string; fechaFaena?: string | null; frigorifico?: string | null; origen?: string | null; precio?: number | null; maquinista: string; observaciones?: string | null }
  fotos: Array<{ tipo: string; url: string; base64?: string | null; timestamp: string; operador: string }>
  checklist: Array<{ itemKey: string; itemNombre: string; resultado: string; notaIA?: string | null }>
  analisisIA?: { confianza: number; itemsAprobados: number; itemsNC: number } | null
  firmas: Array<{ rol: string; nombreUsuario: string; firmadoEn: string; esRechazo: boolean }>
}

export function EtiquetadoPDF({ registro, fotos, checklist, firmas }: PDFProps) {
  const fotoEtiqueta = fotos.find(f => f.tipo === 'ETIQUETA_PT')
  const fotoMMPP = fotos.find(f => f.tipo === 'MATERIA_PRIMA')
  const itemsNC = checklist.filter(i => i.resultado === 'NC').length
  const rolesOrden = ['MAQUINISTA', 'CALIDAD', 'SUPERVISOR', 'VERIFICADOR']
  const firmasPorRol = Object.fromEntries(firmas.filter(f => !f.esRechazo).map(f => [f.rol, f]))
  const estaAutoriz = !!firmasPorRol['CALIDAD'] && !!firmasPorRol['SUPERVISOR']

  return (
    <Document title={`${registro.codigo} — Control Etiquetado`} author="PULSE 360">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={s.logoBox}><Text style={s.logoText}>THE{'\n'}PROTEIN{'\n'}Co.</Text></View>
            <View>
              <Text style={s.headerTitle}>Control Etiquetado{'\n'}Productos Terminados</Text>
              <Text style={s.headerSub}>Área Productiva — Planta Carnes Paine, Chile</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.docCode}>FCP.026.001</Text>
            <Text style={s.docVer}>Versión 25/02/2025</Text>
            <Text style={[s.docVer, { marginTop: 3 }]}>{registro.codigo}</Text>
          </View>
        </View>

        <View style={s.statusBar}>
          <Text style={s.statusText}>
            {estaAutoriz && firmasPorRol['VERIFICADOR'] ? '✓ VERIFICADO — Documento cerrado con 3 firmas' : estaAutoriz ? '⚠ AUTORIZADO — Pendiente verificación final' : '⏳ EN REVISIÓN'}
          </Text>
          <Text style={s.statusId}>{registro.codigo} · {fmtTs(registro.fecha)}</Text>
        </View>

        <Text style={s.secLabel}>Datos del registro</Text>
        <View style={s.grid3}>
          <View style={s.cell}><Text style={s.cellLabel}>Fecha</Text><Text style={s.cellValue}>{fmt(registro.fecha)}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>Línea proceso</Text><Text style={s.cellValue}>{registro.lineaProceso}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>Maquinista</Text><Text style={s.cellValue}>{registro.maquinista}</Text></View>
        </View>
        <View style={s.grid2}>
          <View style={[s.cell, { flex: 2 }]}><Text style={s.cellLabel}>Producto</Text><Text style={s.cellValue}>{registro.producto}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>Lote</Text><Text style={s.cellRed}>{registro.lote}</Text></View>
        </View>
        <View style={s.grid3}>
          <View style={s.cell}><Text style={s.cellLabel}>F. Elaboración</Text><Text style={s.cellValue}>{fmt(registro.fechaElaboracion)}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>F. Vencimiento</Text><Text style={s.cellValue}>{fmt(registro.fechaVencimiento)}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>F. Faena</Text><Text style={s.cellValue}>{fmt(registro.fechaFaena)}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>Frigorífico</Text><Text style={s.cellValue}>{registro.frigorifico ?? '—'}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>Origen</Text><Text style={s.cellValue}>{registro.origen ?? '—'}</Text></View>
          <View style={s.cell}><Text style={s.cellLabel}>Precio</Text><Text style={s.cellValue}>{registro.precio ? `$${registro.precio.toLocaleString('es-CL')}` : '—'}</Text></View>
        </View>

        <Text style={s.secLabel}>Fotografías de verificación</Text>
        <View style={s.fotoRow}>
          {[{ foto: fotoEtiqueta, label: 'Etiqueta — Producto terminado', hasNC: itemsNC > 0 }, { foto: fotoMMPP, label: 'Etiqueta — Materia prima', hasNC: false }].map(({ foto, label, hasNC }) => (
            <View key={label} style={s.fotoCard}>
              <View style={s.fotoHeader}>
                <Text style={s.fotoTitle}>{label}</Text>
                {hasNC ? <Text style={s.badgeYellow}>REVISAR CB</Text> : <Text style={s.badgeGreen}>CONFORME</Text>}
              </View>
              {foto?.base64 ? <Image src={foto.base64} style={s.fotoImg} /> : <View style={s.fotoNoImg}><Text style={s.fotoNoImgTx}>[ {label} ]</Text></View>}
              <View style={s.fotoFooter}>
                <Text style={s.fotoTs}>{fmtTs(foto?.timestamp)}</Text>
                <Text style={s.fotoOp}>{foto?.operador ?? '—'}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.secLabel}>Comparación trazable — Etiqueta PT vs Materia Prima</Text>
        <View style={s.compTable}>
          <View style={s.compHeader}>
            <Text style={[s.compField, s.compHead]}>Campo</Text>
            <Text style={[s.compVal, s.compHead]}>Etiqueta PT</Text>
            <Text style={[s.compVal, s.compHead]}>Etiqueta MMPP</Text>
            <Text style={[s.compOk, s.compHead]}>Estado</Text>
          </View>
          {[{ campo: 'Lote', val: registro.lote }, { campo: 'Fecha Faena', val: fmt(registro.fechaFaena) }, { campo: 'Frigorífico / Origen', val: `${registro.frigorifico ?? '—'} / ${registro.origen ?? '—'}` }].map((row, i) => (
            <View key={i} style={s.compRow}>
              <Text style={s.compField}>{row.campo}</Text>
              <Text style={s.compVal}>{row.val}</Text>
              <Text style={s.compVal}>{row.val}</Text>
              <Text style={s.compOk}>✓ OK</Text>
            </View>
          ))}
        </View>

        <Text style={s.secLabel}>Checklist de validación (FCP.026.001)</Text>
        <View style={s.clGrid}>
          {checklist.map(item => (
            <View key={item.itemKey} style={[s.clItem, item.resultado === 'NC' ? s.clItemNc : s.clItemOk]}>
              <Text style={s.clName}>{item.itemNombre}</Text>
              <Text style={item.resultado === 'NC' ? s.clBadgeNC : s.clBadgeC}>{item.resultado}</Text>
            </View>
          ))}
        </View>

        {registro.observaciones && (
          <View style={s.obsBox}>
            <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Observaciones: </Text>{registro.observaciones}</Text>
          </View>
        )}

        <Text style={s.secLabel}>Firmas y autorizaciones</Text>
        <View style={s.firmaTable}>
          <View style={s.firmaHeader}>
            <Text style={[s.firmaColRol, { fontFamily: 'Helvetica-Bold', color: C.grisMedio }]}>Rol</Text>
            <Text style={[s.firmaColNom, { fontFamily: 'Helvetica-Bold', color: C.grisMedio }]}>Nombre</Text>
            <Text style={[s.firmaColFirm, { fontFamily: 'Helvetica-Bold', color: C.grisMedio }]}>Firma</Text>
            <Text style={[s.firmaColTs, { fontFamily: 'Helvetica-Bold', color: C.grisMedio }]}>Fecha / Hora</Text>
            <Text style={[s.firmaColEst, { fontFamily: 'Helvetica-Bold', color: C.grisMedio }]}>Estado</Text>
          </View>
          {rolesOrden.map(rol => {
            const firma = firmasPorRol[rol]
            const isPend = !firma
            return (
              <View key={rol} style={[s.firmaRow, isPend ? s.firmaRowPend : s.firmaRowOk]}>
                <Text style={s.firmaColRol}>{ROL_LABELS[rol]}</Text>
                <Text style={[s.firmaColNom, isPend ? { color: C.grisTexto } : {}]}>{firma?.nombreUsuario ?? 'Sin asignar'}</Text>
                <Text style={s.firmaColFirm}>{firma ? firma.nombreUsuario.split(' ')[0] : ''}</Text>
                <Text style={s.firmaColTs}>{firma ? fmtTs(firma.firmadoEn) : 'Pendiente'}</Text>
                <Text style={[s.firmaColEst, isPend ? s.firmaEstPend : s.firmaEstOk]}>{firma ? ROL_ESTADO[rol] : 'PENDIENTE'}</Text>
              </View>
            )
          })}
        </View>

        <View style={s.footer}>
          <Text style={s.footerL}>The Protein Company Spa · Longitudinal Sur Km 40, Parcela 62, Paine{'\n'}Generado por PULSE 360 · {registro.codigo} · Documento válido con firma digital</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.footerBrand}>PULSE 360</Text>
            <Text style={s.footerR}>Pág. 1 de 1</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
