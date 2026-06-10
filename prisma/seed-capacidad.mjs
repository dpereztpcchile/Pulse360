// Seed idempotente de configuración de horarios/capacidad. No toca otros datos.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const parse = (h) => { const [hh, mm] = h.split(':').map(Number); return hh + mm / 60 }
const hh = (ing, sal, col) => Math.round((parse(sal) - parse(ing) - col) * 10) / 10
// día operativo: [ingreso, salida, colacion]
const D = (ing, sal, col = 0.5) => ({ opera: true, ingreso: ing, salida: sal, colacion: col, HH: hh(ing, sal, col) })
const OFF = { opera: false, ingreso: null, salida: null, colacion: 0, HH: null }
// arma 7 días (1..7) a partir de un mapa parcial {1:D(...),...}
const dias7 = (map) => Array.from({ length: 7 }, (_, i) => ({ dia: i + 1, ...(map[i + 1] ?? OFF) }))

// 2 turnos Mañana/Tarde compartidos por Molienda y Molida 1/2
const turnosMolienda = () => [
  { nombre: 'Mañana', personas: 1, orden: 1, dias: dias7({ 1: D('07:00', '15:00'), 2: D('07:00', '14:00'), 3: D('07:00', '14:00'), 4: D('07:00', '14:00'), 5: D('07:00', '14:00'), 6: D('07:00', '16:00') }) },
  { nombre: 'Tarde', personas: 1, orden: 2, dias: dias7({ 1: D('11:00', '20:00'), 2: D('13:30', '22:30'), 3: D('13:30', '23:00'), 4: D('13:30', '23:00'), 5: D('13:30', '21:00') }) },
]

const LINEAS = [
  {
    nombre: 'Carnicería', tipo: 'kg_hh', orden: 1,
    config: { kgPorHH: 100 },
    turnos: [
      { nombre: 'C1', personas: 12, orden: 1, dias: dias7({ 1: D('07:00', '13:00'), 2: D('07:00', '15:00'), 3: D('07:00', '16:30'), 4: D('07:00', '16:30'), 5: D('07:00', '13:00'), 6: D('07:00', '13:00') }) },
      { nombre: 'C2', personas: 4, orden: 2, dias: dias7({ 1: D('07:00', '14:00'), 2: D('07:00', '17:00'), 3: D('07:00', '16:30'), 4: D('07:00', '16:30'), 5: D('07:00', '15:30') }) },
      { nombre: 'C3', personas: 1, orden: 3, dias: dias7({ 1: D('07:30', '15:00'), 2: D('07:30', '15:00'), 3: D('07:30', '15:00'), 4: D('07:30', '15:00'), 5: D('07:30', '15:00'), 6: D('07:30', '15:00') }) },
    ],
  },
  {
    nombre: 'Molienda', tipo: 'batch', orden: 6,
    config: { minsPorBatch: 20, kgPorBatch: 900 },
    turnos: turnosMolienda(),
  },
  // Molida (L1 + L2 consolidadas en una sola línea): mismo horario que Molienda.
  // Capacidad conjunta = disponibles × 2.600 kg/h (1.300 por línea × 2 líneas en paralelo)
  {
    // Envasado L1/L2: 2 turnos (Mañana L-S + Tarde). Viernes Tarde fuera por contingencia.
    nombre: 'Molida', tipo: 'molida', orden: 7,
    config: { kgPorHora: 2600, golpesPorMinuto: 90, setupMin: 30, setPointMin: 6, formatosDia: 6 },
    turnos: [
      turnosMolienda()[0], // Mañana (L-S)
      { nombre: 'Tarde', personas: 1, orden: 2, dias: dias7({ 1: D('11:00', '20:00'), 2: D('13:30', '22:30'), 3: D('13:30', '23:00'), 4: D('13:30', '23:00') }) }, // L-J (Vie fuera)
    ],
  },
  // Hamburguesas y Albóndigas: mismo horario/ventana que Molida (comparten equipo).
  // tipo 'ventana': capacidad = disponibles × kg/hora fijo (no escala con dotación).
  {
    nombre: 'Hamburguesas', tipo: 'ventana', orden: 9,
    config: { kgPorHora: 250, setupMin: 30, setPointMin: 6, formatosDia: 6 },
    turnos: turnosMolienda(),
  },
  {
    nombre: 'Albóndigas', tipo: 'ventana', orden: 10,
    config: { kgPorHora: 200, setupMin: 30, setPointMin: 6, formatosDia: 6 },
    turnos: turnosMolienda(),
  },
  // Milanesas: horario real L-V, 60 kg/h fijo (no escala con dotación)
  {
    nombre: 'Milanesas', tipo: 'kg_hora', orden: 5,
    config: { kgPorHora: 60 },
    turnos: [{ nombre: 'Milanesas', personas: 1, orden: 1, dias: dias7({ 1: D('08:00', '16:30'), 2: D('08:00', '17:00'), 3: D('08:00', '17:00'), 4: D('08:00', '17:00'), 5: D('08:00', '17:00') }) }],
  },
  // Resto: 1 turno, 8h/día (07:00–15:30 con 0.5 colación = 8.0h)
  ...[
    { nombre: 'Línea 4', kgPorHora: 800, orden: 2, ds: [1, 2, 3, 4, 5, 6] },
    { nombre: 'Línea 5', kgPorHora: 500, orden: 3, ds: [1, 2, 3, 4, 5, 6] },
    { nombre: 'Skin Pack', kgPorHora: 60, orden: 4, ds: [1, 2, 3, 4, 5] },
  ].map((l) => ({
    nombre: l.nombre, tipo: 'kg_hora', orden: l.orden,
    config: { kgPorHora: l.kgPorHora },
    turnos: [{ nombre: 'Turno único', personas: 1, orden: 1, dias: dias7(Object.fromEntries(l.ds.map((d) => [d, D('07:00', '15:30')]))) }],
  })),
]

// Elimina líneas obsoletas (Molida 1/2 ahora consolidadas en "Molida")
await prisma.linea.deleteMany({ where: { nombre: { in: ['Línea Molida 1', 'Línea Molida 2'] } } })

for (const L of LINEAS) {
  const linea = await prisma.linea.upsert({
    where: { nombre: L.nombre },
    create: { nombre: L.nombre, tipo: L.tipo, orden: L.orden, activa: true },
    update: { tipo: L.tipo, orden: L.orden, activa: true },
  })
  await prisma.configProductividad.upsert({
    where: { lineaId: linea.id },
    create: { lineaId: linea.id, tipo: L.tipo, ...L.config, actualizadoPor: 'seed' },
    update: { tipo: L.tipo, kgPorHora: null, kgPorHH: null, minsPorBatch: null, kgPorBatch: null, golpesPorMinuto: null, setupMin: null, setPointMin: null, formatosDia: null, ...L.config, actualizadoPor: 'seed' },
  })
  // Reemplaza turnos de la línea (cascade borra horarios)
  await prisma.turno.deleteMany({ where: { lineaId: linea.id } })
  for (const T of L.turnos) {
    await prisma.turno.create({
      data: {
        lineaId: linea.id, nombre: T.nombre, personas: T.personas, orden: T.orden, activo: true,
        horarioDias: { create: T.dias.map((d) => ({ dia: d.dia, opera: d.opera, ingreso: d.ingreso, salida: d.salida, colacion: d.colacion, HH: d.HH })) },
      },
    })
  }
  console.log('✓', L.nombre, `(${L.tipo})`, '·', L.turnos.length, 'turno(s)')
}

await prisma.$disconnect()
console.log('Seed de capacidad completado.')
