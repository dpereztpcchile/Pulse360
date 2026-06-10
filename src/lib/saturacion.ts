// PULSE 360 — Saturación semanal de planta: parser de proyección + cálculo de los 3 ítems.
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { getLineasConfig, capacidadDiaDeLinea, horasDisponiblesMolida } from '@/lib/capacidad'

// ── Clasificación de SKU ──
export const SKU_MOLIDAS = new Set([1995701, 1998017, 1998019, 2035083, 2035591, 2035592, 2074729, 2074730])
export const SKU_MILANESAS = new Set([2070233, 2070234])
// Variedades: unidades × gramaje (kg)
export const VARIEDADES: Record<number, { tipo: 'hamburguesa' | 'albondiga'; gramaje: number }> = {
  2025717: { tipo: 'hamburguesa', gramaje: 0.250 }, // HAMBURGUESA 2X125 250G
  2025718: { tipo: 'albondiga', gramaje: 0.420 },    // ALBONDIGA 12X35 420G
  2068718: { tipo: 'hamburguesa', gramaje: 0.250 },  // HAMBURGUESA SMASH 2UN 250G
}
// Rendimientos de respaldo (se prioriza la hoja BASE del archivo)
export const REND_FALLBACK: Record<number, number> = {
  1997791: 0.4816, 1997790: 0.4465, 1997789: 0.3919, 1997257: 0.4035, 1997788: 0.5000,
  1995237: 0.5591, 1995236: 0.5477, 1995694: 0.5086, 1995235: 0.4114, 1995233: 0.5934,
  1995234: 0.5674, 1995696: 0.4408, 1995232: 0.5939, 1996519: 0.5468, 1998537: 0.5590, 1996518: 0.4936,
}

// Productividad Variedades (kg/h) para el cálculo de HH en Molidas
export const KGH_HAMBURGUESAS = 250
export const KGH_ALBONDIGAS = 200
export const KGH_MOLIDAS = 2600

export function categoriaDe(sku: number, desc: string): string {
  if (VARIEDADES[sku]) return 'VARIEDADES'
  if (SKU_MOLIDAS.has(sku)) return 'MOLIDAS'
  if (SKU_MILANESAS.has(sku)) return 'MILANESAS'
  const d = (desc || '').toUpperCase()
  if (d.includes('HAMBURG') || d.includes('ALBOND')) return 'VARIEDADES'
  if (d.includes('MILANESA')) return 'MILANESAS'
  if (d.includes('MOLIDA')) return 'MOLIDAS'
  if (REND_FALLBACK[sku] || d.includes('BISTEC') || d.includes('ESCALOPA') || d.includes('CARNE')) return 'CARNICERIA'
  return 'CARNICERIA'
}

export function grupoCarniceria(desc: string): string {
  const d = (desc || '').toUpperCase()
  const jumbo = d.includes('JUMBO'), sisa = d.includes('SISA')
  if (d.includes('BISTEC')) return jumbo ? 'Bistec JUMBO' : sisa ? 'Bistec SISA' : 'Otros Carnicería'
  if (d.includes('ESCALOPA')) return jumbo ? 'Escalopa JUMBO' : sisa ? 'Escalopa SISA' : 'Otros Carnicería'
  if (d.includes('CARNE') || d.includes('FILETE')) return 'Carnes Desgrasadas'
  return 'Otros Carnicería'
}

export const GRUPOS_CARNICERIA = ['Bistec JUMBO', 'Bistec SISA', 'Escalopa JUMBO', 'Escalopa SISA', 'Carnes Desgrasadas', 'Otros Carnicería']
// Paleta sobria slate/teal
export const COLOR_GRUPO: Record<string, string> = {
  'Bistec JUMBO': '#0e7490', 'Bistec SISA': '#22d3ee', 'Escalopa JUMBO': '#0d9488',
  'Escalopa SISA': '#5eead4', 'Carnes Desgrasadas': '#64748b', 'Otros Carnicería': '#334155',
}

// ── Parser del archivo (.xlsx) ──
export interface ParsedProducto { sku: number; descripcion: string; categoria: string; rendimientoSAP: number | null; pedidos: number[] }

const norm = (s: unknown) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const toNum = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').trim()
  if (!s) return 0
  let t = s
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.') // formato "1.234,56"
  const n = Number(t.replace(/[^\d.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const CATS = ['CARNICERIA', 'MOLIDAS', 'VARIEDADES', 'MILANESAS']

export function parseProyeccion(buf: Buffer): { rendimientos: Record<number, number>; productos: ParsedProducto[] } {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheetName = (frag: string) => wb.SheetNames.find((n) => norm(n).includes(frag)) ?? null

  // BASE → rendimientos por SKU (col COD → col RENDIMIENTO SAP)
  const rendimientos: Record<number, number> = {}
  const baseName = sheetName('BASE')
  if (baseName) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[baseName], { header: 1, blankrows: false, defval: '' })
    let hdr = -1, cSku = -1, cRend = -1
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const r = (rows[i] as unknown[]).map(norm)
      const sku = r.findIndex((c) => c === 'COD' || c.startsWith('COD') || c.includes('SKU') || c.includes('CODIGO') || c.includes('MATERIAL'))
      const rend = r.findIndex((c) => c.includes('RENDIMIENTO'))
      if (sku >= 0 && rend >= 0) { hdr = i; cSku = sku; cRend = rend; break }
    }
    if (hdr >= 0) {
      for (let i = hdr + 1; i < rows.length; i++) {
        const r = rows[i] as unknown[]
        const sku = parseInt(String(r[cSku] ?? '').replace(/\D/g, ''), 10)
        if (!sku) continue
        let rend = toNum(r[cRend])
        if (rend > 1.5) rend = rend / 100 // viene como porcentaje
        if (rend > 0) rendimientos[sku] = Math.round(rend * 100000) / 100000
      }
    }
  }

  // PROYECCIÓN → SKU(0) · desc(1) · días L-V(2-6) · categoría(8)
  const productos: ParsedProducto[] = []
  const proyName = sheetName('PROYEC') ?? sheetName('PROYECCION')
  if (proyName) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[proyName], { header: 1, blankrows: false, defval: '' })
    for (const raw of rows) {
      const r = raw as unknown[]
      const sku = parseInt(String(r[0] ?? '').replace(/\D/g, ''), 10)
      if (!sku || sku < 1000) continue
      const desc = String(r[1] ?? '').trim()
      if (!desc) continue
      const dias = [r[2], r[3], r[4], r[5], r[6], r[7]].map(toNum) // L M X J V S
      // Todos los pedidos vienen en kg de producto terminado (sin conversión por gramaje)
      const pedidos = dias.map((n) => Math.round(n * 10) / 10)
      const catCol = norm(r[8])
      const categoria = CATS.includes(catCol) ? catCol : categoriaDe(sku, desc)
      const rend = rendimientos[sku] ?? REND_FALLBACK[sku] ?? null
      productos.push({ sku, descripcion: desc, categoria, rendimientoSAP: rend, pedidos })
    }
  }
  return { rendimientos, productos }
}

// ── Cálculo de saturación ──
export interface SaturacionResult {
  semana: string; fechaInicio: string; fechaFin: string
  dias: string[]
  carniceria: { capacidad: number[]; mpRequerida: number[]; saturacion: number[]; grupos: { nombre: string; color: string; mp: number[]; pt: number[] }[] }
  molidas: {
    horasDisponibles: number[]; hhHamburguesas: number[]; hhAlbondigas: number[]; hhVariedades: number[]; hhMolidas: number[]
    pedidoHamburguesas: number[]; pedidoAlbondigas: number[]; capacidadMolidas: number[]; pedidoMolidas: number[]; saturacion: number[]; holguraH: number[]
  }
  milanesas: { capacidad: number[]; pedido: number[]; holgura: number[]; saturacion: number[]; holguraAcum: number }
}

const DIAS_LBL = ['L', 'M', 'X', 'J', 'V', 'S']
const r1 = (n: number) => Math.round(n * 10) / 10
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

export async function getSaturacion(semana: string): Promise<SaturacionResult | null> {
  const proy = await prisma.proyeccionSemanal.findUnique({ where: { semana }, include: { productos: true } })
  if (!proy) return null

  const lineas = await getLineasConfig()
  const carn = lineas.find((l) => l.nombre === 'Carnicería')
  const molida = lineas.find((l) => l.nombre === 'Molida')
  const milan = lineas.find((l) => l.nombre === 'Milanesas')

  const pedidoDia = (p: { pedidoLunes: number; pedidoMartes: number; pedidoMiercoles: number; pedidoJueves: number; pedidoViernes: number; pedidoSabado: number }) =>
    [p.pedidoLunes, p.pedidoMartes, p.pedidoMiercoles, p.pedidoJueves, p.pedidoViernes, p.pedidoSabado]

  const dias6 = [1, 2, 3, 4, 5, 6]

  // ── Carnicería (capacidad expresada en PT con el rendimiento del programa) ──
  // Rendimiento del programa de Carnicería más reciente (ej. 01-06): PT total / MP total.
  const prog = await prisma.programaCarniceria.findFirst({ orderBy: { fecha: 'desc' }, include: { cortes: { select: { kgPTPlan: true, kgMPTeorico: true } } } })
  let rendPrograma = 0.45
  if (prog && prog.cortes.length) {
    const sPT = prog.cortes.reduce((a, c) => a + c.kgPTPlan, 0)
    const sMP = prog.cortes.reduce((a, c) => a + c.kgMPTeorico, 0)
    if (sMP > 0) rendPrograma = sPT / sMP
  }

  const capCarnMP = dias6.map((d) => (carn ? capacidadDiaDeLinea(carn, d) : 0))
  const capCarnPT = capCarnMP.map((c) => c * rendPrograma) // capacidad en producto terminado
  const gruposMap = new Map<string, { mp: number[]; pt: number[] }>()
  GRUPOS_CARNICERIA.forEach((g) => gruposMap.set(g, { mp: new Array(6).fill(0), pt: new Array(6).fill(0) }))
  const mpReq = new Array(6).fill(0)
  const ptReq = new Array(6).fill(0)
  for (const p of proy.productos.filter((x) => x.categoria === 'CARNICERIA')) {
    const g = grupoCarniceria(p.descripcion)
    const ped = pedidoDia(p)
    const rend = p.rendimientoSAP ?? REND_FALLBACK[p.sku] ?? null
    ped.forEach((kgPT, i) => {
      const mp = rend && rend > 0 ? kgPT / rend : 0
      mpReq[i] += mp; ptReq[i] += kgPT
      const gg = gruposMap.get(g)!; gg.mp[i] += mp; gg.pt[i] += kgPT
    })
  }
  const carniceria = {
    capacidad: capCarnPT.map(r1),        // PT
    capacidadMP: capCarnMP.map(r1),      // MP (referencia)
    rendimiento: Math.round(rendPrograma * 1000) / 1000,
    pedidoPT: ptReq.map(r1),
    mpRequerida: mpReq.map(r1),
    saturacion: ptReq.map((v, i) => pct(v, capCarnPT[i])), // PT vs PT
    grupos: GRUPOS_CARNICERIA.map((g) => ({ nombre: g, color: COLOR_GRUPO[g], mp: gruposMap.get(g)!.mp.map(r1), pt: gruposMap.get(g)!.pt.map(r1) })),
  }

  // ── Molidas ──
  const horasDisp = dias6.map((d) => (molida ? horasDisponiblesMolida(molida, d) : 0))
  const pedHamb = new Array(6).fill(0), pedAlb = new Array(6).fill(0), pedMol = new Array(6).fill(0)
  for (const p of proy.productos) {
    const ped = pedidoDia(p)
    if (p.categoria === 'VARIEDADES') {
      const esHamb = norm(p.descripcion).includes('HAMBURG')
      ped.forEach((kg, i) => { if (esHamb) pedHamb[i] += kg; else pedAlb[i] += kg })
    } else if (p.categoria === 'MOLIDAS') {
      ped.forEach((kg, i) => { pedMol[i] += kg })
    }
  }
  // Tasa de ENVASADO de las líneas Molida 1 y 2 (conjunto), desde su config (no Molienda/molino).
  const tasaEnvasado = molida?.config?.kgPorHora ?? KGH_MOLIDAS
  const hhHamb = pedHamb.map((kg) => kg / KGH_HAMBURGUESAS)
  const hhAlb = pedAlb.map((kg) => kg / KGH_ALBONDIGAS)
  // Hamburguesas (L1) y Albóndigas (L2) se elaboran EN PARALELO en líneas separadas →
  // las horas de variedades = la del producto que dura más (no la suma).
  const hhVar = hhHamb.map((h, i) => Math.max(h, hhAlb[i]))
  const horasMol = horasDisp.map((h, i) => Math.max(0, h - hhVar[i]))
  const capTotal = horasDisp.map((h) => Math.round(h * tasaEnvasado))     // capacidad total de envasado L1/L2
  const capMol = horasMol.map((h) => Math.round(h * tasaEnvasado))         // capacidad para molidas (tras variedades)
  const hhMolNec = pedMol.map((kg) => kg / tasaEnvasado)
  const holguraH = horasDisp.map((h, i) => h - hhVar[i] - hhMolNec[i])
  const molidas = {
    horasDisponibles: horasDisp.map(r1), hhHamburguesas: hhHamb.map(r1), hhAlbondigas: hhAlb.map(r1),
    hhVariedades: hhVar.map(r1), hhMolidas: horasMol.map(r1), pedidoHamburguesas: pedHamb.map(r1), pedidoAlbondigas: pedAlb.map(r1),
    capacidadTotal: capTotal, capacidadMolidas: capMol, pedidoMolidas: pedMol.map(r1),
    saturacion: pedMol.map((v, i) => pct(v, capMol[i])), holguraH: holguraH.map(r1),
  }

  // ── Milanesas (L-V) ──
  const capMil = dias6.map((d) => (milan ? capacidadDiaDeLinea(milan, d) : 0))
  const pedMil = new Array(6).fill(0)
  for (const p of proy.productos.filter((x) => x.categoria === 'MILANESAS')) {
    pedidoDia(p).forEach((kg, i) => { pedMil[i] += kg })
  }
  const holgMil = capMil.map((c, i) => c - pedMil[i])
  const milanesas = {
    capacidad: capMil.map(r1), pedido: pedMil.map(r1), holgura: holgMil.map(r1),
    saturacion: pedMil.map((v, i) => pct(v, capMil[i])),
    holguraAcum: r1(holgMil.slice(0, 5).reduce((a, b) => a + Math.max(0, b), 0)),
  }

  return {
    semana: proy.semana, fechaInicio: proy.fechaInicio.toISOString().slice(0, 10), fechaFin: proy.fechaFin.toISOString().slice(0, 10),
    dias: DIAS_LBL, carniceria, molidas, milanesas,
  }
}
