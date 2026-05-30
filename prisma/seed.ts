import { PrismaClient, UserRole, PlantStatus, LineStatus, Shift, OrderStatus, MaterialCategory, DispatchStatus, NcCategory, NcSeverity, NcStatus, AlertModule, AlertSeverity, AlertStatus, RegistroEstado, CapacidadEstado } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de base de datos PULSE 360...')

  // Reset de datos demo (orden por dependencias)
  await prisma.cargaPrograma.deleteMany()
  await prisma.capacidadDiaria.deleteMany()
  await prisma.configuracionTurnos.deleteMany()
  await prisma.registroCorteCarniceria.deleteMany()
  await prisma.programaCarniceria.deleteMany()
  await prisma.catalogoCortesCarniceria.deleteMany()
  await prisma.oEETurno.deleteMany()
  await prisma.paradaTurno.deleteMany()
  await prisma.registroBatch.deleteMany()
  await prisma.registroProduccion.deleteMany()
  await prisma.programaDiario.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.alertConfig.deleteMany()
  await prisma.demandPlan.deleteMany()
  await prisma.lineCapacity.deleteMany()
  await prisma.ncStatusChange.deleteMany()
  await prisma.nonConformity.deleteMany()
  await prisma.dispatch.deleteMany()
  await prisma.materialConsumption.deleteMany()
  await prisma.materialReceipt.deleteMany()
  await prisma.material.deleteMany()
  await prisma.productionOrder.deleteMany()
  await prisma.productionLine.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.plant.deleteMany()
  console.log('🧹 Datos demo anteriores eliminados')

  // Planta de ejemplo (elaboración de productos cárnicos)
  const plantaCentro = await prisma.plant.create({
    data: {
      name: 'Planta Cárnica Central',
      code: 'PLANTA-CENTRAL',
      location: 'Santiago, Chile',
      status: PlantStatus.ACTIVA,
    },
  })
  console.log(`✅ Planta creada: ${plantaCentro.name}`)

  // Contraseñas hasheadas con bcrypt (12 rounds)
  const passAdmin = await bcrypt.hash('Pulse360#Admin', 12)
  const passStd = await bcrypt.hash('Pulse360#2024', 12)

  const usuarios = [
    { name: 'Carlos Reyes',     email: 'admin@pulse360.cl',       password: passAdmin, role: UserRole.ADMINISTRADOR },
    { name: 'María González',   email: 'supervisor1@pulse360.cl', password: passStd,   role: UserRole.SUPERVISOR },
    { name: 'Pedro Soto',       email: 'supervisor2@pulse360.cl', password: passStd,   role: UserRole.SUPERVISOR },
    { name: 'Juan Pérez',       email: 'operador1@pulse360.cl',   password: passStd,   role: UserRole.OPERADOR },
    { name: 'Ana Torres',       email: 'operador2@pulse360.cl',   password: passStd,   role: UserRole.OPERADOR },
    { name: 'Luis Rojas',       email: 'operador3@pulse360.cl',   password: passStd,   role: UserRole.OPERADOR },
  ]

  for (const u of usuarios) {
    await prisma.user.create({
      data: { ...u, plantId: plantaCentro.id, active: true },
    })
  }

  console.log('✅ Usuarios creados:')
  console.log('   👤 Administrador: admin@pulse360.cl       / Pulse360#Admin')
  console.log('   👤 Supervisor 1:  supervisor1@pulse360.cl / Pulse360#2024')
  console.log('   👤 Supervisor 2:  supervisor2@pulse360.cl / Pulse360#2024')
  console.log('   👤 Operador 1:    operador1@pulse360.cl   / Pulse360#2024')
  console.log('   👤 Operador 2:    operador2@pulse360.cl   / Pulse360#2024')
  console.log('   👤 Operador 3:    operador3@pulse360.cl   / Pulse360#2024')

  // ── Líneas de producción (planta cárnica — layout Control de Turno) ──
  // oeeMin = 70 → la planta dispara alerta cuando el OEE de una línea cae bajo 70%.
  // Codes deben coincidir con LINE_CATALOG en src/lib/control-turno/config.ts
  const lineasData = [
    { name: 'Carnicería',     code: 'CARNICERIA', status: LineStatus.OPERANDO,       dailyPlanKg: 3200, oee: 81.4, oeeMin: 70, utilization: 78 },
    { name: 'Línea 4',        code: 'L4',         status: LineStatus.OPERANDO,       dailyPlanKg: 6400, oee: 84.2, oeeMin: 70, utilization: 80 },
    { name: 'Línea 5',        code: 'L5',         status: LineStatus.OPERANDO,       dailyPlanKg: 4000, oee: 76.9, oeeMin: 70, utilization: 72 },
    { name: 'Skin Pack',      code: 'SKIN',       status: LineStatus.EN_OBSERVACION, dailyPlanKg: 2500, oee: 62.3, oeeMin: 70, utilization: 45 },
    { name: 'Milanesas',      code: 'MILANESAS',  status: LineStatus.OPERANDO,       dailyPlanKg: 1800, oee: 0,    oeeMin: 70, utilization: 60 },
    { name: 'Molienda',       code: 'MOLIENDA',   status: LineStatus.OPERANDO,       dailyPlanKg: 21600,oee: 79.1, oeeMin: 70, utilization: 75 },
    { name: 'Línea Molida 1', code: 'LM1',        status: LineStatus.OPERANDO,       dailyPlanKg: 24000,oee: 86.5, oeeMin: 70, utilization: 82 },
    { name: 'Línea Molida 2', code: 'LM2',        status: LineStatus.DETENIDO,       dailyPlanKg: 24000,oee: 0,    oeeMin: 70, utilization: 0 },
  ]
  const lineas = []
  const byCode: Record<string, { id: string }> = {}
  for (const l of lineasData) {
    const created = await prisma.productionLine.create({ data: { ...l, plantId: plantaCentro.id } })
    lineas.push(created)
    byCode[l.code] = created
  }
  const L = (code: string) => byCode[code].id
  console.log(`✅ Líneas de producción creadas: ${lineas.length}`)

  // ── Órdenes de producción (fechadas hoy) ──
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const ordenesData = [
    { orderNumber: 'OP-2026-0001', product: 'Carne Molida Especial 500g',      lineId: L('LM1'),       shift: Shift.MANANA, plannedKg: 2500, realKg: 2380, status: OrderStatus.COMPLETADA,  responsible: 'Juan Pérez', observations: 'Ajuste de molienda por temperatura MP' },
    { orderNumber: 'OP-2026-0002', product: 'Bistec de Paleta 1kg',            lineId: L('CARNICERIA'), shift: Shift.TARDE,  plannedKg: 1800, realKg: 1750, status: OrderStatus.COMPLETADA,  responsible: 'Ana Torres',  observations: null },
    { orderNumber: 'OP-2026-0003', product: 'Vacío al Vacío 1kg',              lineId: L('SKIN'),       shift: Shift.MANANA, plannedKg: 900,  realKg: 560,  status: OrderStatus.EN_PROCESO,  responsible: 'Luis Rojas',  observations: 'Cambio de cuchillas programado' },
    { orderNumber: 'OP-2026-0004', product: 'Recorte Magro (granel)',          lineId: L('MOLIENDA'),   shift: Shift.MANANA, plannedKg: 3000, realKg: 0,    status: OrderStatus.DETENIDA,    responsible: 'Luis Rojas',  observations: 'Parada por limpieza CIP' },
    { orderNumber: 'OP-2026-0005', product: 'Carne Molida Corriente 1kg',      lineId: L('LM1'),       shift: Shift.TARDE,  plannedKg: 2000, realKg: 1950, status: OrderStatus.COMPLETADA,  responsible: 'Juan Pérez', observations: null },
    { orderNumber: 'OP-2026-0006', product: 'Carne Molida Vacuno Premium 200g',lineId: L('LM2'),       shift: Shift.NOCHE,  plannedKg: 1200, realKg: 0,    status: OrderStatus.PLANIFICADA, responsible: 'Ana Torres',  observations: null },
    { orderNumber: 'OP-2026-0007', product: 'Bistec de Pierna 500g',           lineId: L('CARNICERIA'), shift: Shift.MANANA, plannedKg: 1500, realKg: 1480, status: OrderStatus.COMPLETADA,  responsible: 'Ana Torres',  observations: null },
    { orderNumber: 'OP-2026-0008', product: 'Bistec Plateada Fina 300g',       lineId: L('L4'),        shift: Shift.NOCHE,  plannedKg: 800,  realKg: 320,  status: OrderStatus.EN_PROCESO,  responsible: 'Luis Rojas',  observations: 'Cambio de cuchillas programado' },
    { orderNumber: 'OP-2026-0009', product: 'Lomo Liso Envasado 500g',         lineId: L('SKIN'),       shift: Shift.TARDE,  plannedKg: 700,  realKg: 690,  status: OrderStatus.COMPLETADA,  responsible: 'Juan Pérez', observations: null },
    { orderNumber: 'OP-2026-0010', product: 'Tapapecho Porcionado 800g',       lineId: L('SKIN'),       shift: Shift.MANANA, plannedKg: 600,  realKg: 0,    status: OrderStatus.PLANIFICADA, responsible: 'Ana Torres',  observations: null },
    { orderNumber: 'OP-2026-0011', product: 'Sebo Refinado (granel)',          lineId: L('MOLIENDA'),   shift: Shift.TARDE,  plannedKg: 2500, realKg: 2450, status: OrderStatus.COMPLETADA,  responsible: 'Luis Rojas',  observations: 'Parada por limpieza CIP' },
  ]
  const ordenes = []
  for (const o of ordenesData) {
    ordenes.push(await prisma.productionOrder.create({ data: { ...o, date: hoy } }))
  }
  console.log(`✅ Órdenes de producción creadas: ${ordenesData.length}`)

  // ── Materias primas e insumos (planta cárnica) ──
  const day = 86_400_000
  const soon = new Date(Date.now() + 2 * day)    // vence en 2 días → próximo a vencer (umbral 3 días)
  const farExpiry = new Date(Date.now() + 120 * day)

  const materialesData = [
    // Materia prima principal (carne)
    { name: 'Media Res Vacuno',         code: 'MP-001', category: MaterialCategory.REFRIGERADO, unit: 'kg', currentStock: 1200, minStock: 500, dailyUsageKg: 900 },
    { name: 'Recorte Vacuno 90/10',     code: 'MP-002', category: MaterialCategory.REFRIGERADO, unit: 'kg', currentStock: 250,  minStock: 300, dailyUsageKg: 350 },
    { name: 'Recorte Vacuno 70/30',     code: 'MP-003', category: MaterialCategory.REFRIGERADO, unit: 'kg', currentStock: 820,  minStock: 300, dailyUsageKg: 300 },
    { name: 'Costillar Entero',         code: 'MP-004', category: MaterialCategory.CONGELADO,   unit: 'kg', currentStock: 640,  minStock: 200, dailyUsageKg: 150 },
    { name: 'Pierna Vacuno',            code: 'MP-005', category: MaterialCategory.REFRIGERADO, unit: 'kg', currentStock: 910,  minStock: 300, dailyUsageKg: 280 },
    { name: 'Paleta Vacuno',            code: 'MP-006', category: MaterialCategory.REFRIGERADO, unit: 'kg', currentStock: 760,  minStock: 300, dailyUsageKg: 260 },
    // Insumos y aditivos
    { name: 'Sal de Cura',              code: 'IN-001', category: MaterialCategory.IMPORTADO,   unit: 'kg', currentStock: 120,  minStock: 50,  dailyUsageKg: 8 },
    { name: 'Condimento Carne Molida',  code: 'IN-002', category: MaterialCategory.IMPORTADO,   unit: 'kg', currentStock: 90,   minStock: 40,  dailyUsageKg: 12 },
    { name: 'Condimento Bistec',        code: 'IN-003', category: MaterialCategory.IMPORTADO,   unit: 'kg', currentStock: 70,   minStock: 40,  dailyUsageKg: 7 },
    { name: 'Eritorbato de Sodio',      code: 'IN-004', category: MaterialCategory.IMPORTADO,   unit: 'kg', currentStock: 35,   minStock: 20,  dailyUsageKg: 2 },
    { name: 'Tripolifosfato',           code: 'IN-005', category: MaterialCategory.IMPORTADO,   unit: 'kg', currentStock: 15,   minStock: 20,  dailyUsageKg: 3 },
    // Envases y embalaje
    { name: 'Bandeja PS Blanca 500g',   code: 'EN-001', category: MaterialCategory.EN_TRANSITO, unit: 'unidades', currentStock: 5000, minStock: 2000, dailyUsageKg: 1200 },
    { name: 'Bandeja PS Blanca 1kg',    code: 'EN-002', category: MaterialCategory.EN_TRANSITO, unit: 'unidades', currentStock: 4200, minStock: 2000, dailyUsageKg: 900 },
    { name: 'Film Stretch Termoformado',code: 'EN-003', category: MaterialCategory.IMPORTADO,   unit: 'metros',   currentStock: 3500, minStock: 1000, dailyUsageKg: 400 },
    { name: 'Bolsa Vacío 15x25cm',      code: 'EN-004', category: MaterialCategory.IMPORTADO,   unit: 'unidades', currentStock: 8000, minStock: 3000, dailyUsageKg: 1500 },
    { name: 'Etiqueta Precio (rollo)',  code: 'EN-005', category: MaterialCategory.EN_TRANSITO, unit: 'unidades', currentStock: 120,  minStock: 50,   dailyUsageKg: 20 },
    { name: 'Caja Cartón 10kg',         code: 'EN-006', category: MaterialCategory.EN_TRANSITO, unit: 'unidades', currentStock: 1500, minStock: 500,  dailyUsageKg: 300 },
    // Refrigeración / insumos planta
    { name: 'Hielo en escamas',         code: 'PL-001', category: MaterialCategory.REFRIGERADO, unit: 'kg', currentStock: 800,  minStock: 200, dailyUsageKg: 250 },
    { name: 'Gas Refrigerante R404A',   code: 'PL-002', category: MaterialCategory.EN_TRANSITO, unit: 'kg', currentStock: 90,   minStock: 50,  dailyUsageKg: 1 },
  ]
  const materiales: Record<string, string> = {}
  for (const m of materialesData) {
    const created = await prisma.material.create({ data: { ...m, plantId: plantaCentro.id } })
    materiales[m.code] = created.id
  }
  console.log(`✅ Insumos creados: ${materialesData.length}`)

  // Ingresos (con lotes y vencimientos; uno próximo a vencer)
  await prisma.materialReceipt.createMany({
    data: [
      { materialId: materiales['MP-001'], supplier: 'Frigorífico del Sur S.A.',  quantity: 1000, lot: 'MR-2026-001', expiryDate: soon,      entryTemp: 1,    receivedBy: 'Pedro Soto' },
      { materialId: materiales['MP-002'], supplier: 'Frigorífico Central Ltda.', quantity: 500,  lot: 'RC-2026-014', expiryDate: farExpiry, entryTemp: 2,    receivedBy: 'María González' },
      { materialId: materiales['MP-004'], supplier: 'Frigorífico del Sur S.A.',  quantity: 600,  lot: 'CO-2026-031', expiryDate: farExpiry, entryTemp: -18,  receivedBy: 'Pedro Soto' },
      { materialId: materiales['MP-005'], supplier: 'Agroganadera Los Andes',    quantity: 900,  lot: 'PV-2026-022', expiryDate: farExpiry, entryTemp: 2,    receivedBy: 'María González' },
      { materialId: materiales['IN-001'], supplier: 'Brenntag Chile',            quantity: 100,  lot: 'SC-2026-008', expiryDate: farExpiry, entryTemp: null, receivedBy: 'Pedro Soto' },
      { materialId: materiales['EN-001'], supplier: 'Plastipak Chile',           quantity: 5000, lot: null,          expiryDate: null,      entryTemp: null, receivedBy: 'María González' },
    ],
  })

  // Consumos (uno vinculado a orden, uno de uso general)
  await prisma.materialConsumption.createMany({
    data: [
      { materialId: materiales['MP-001'], quantity: 800, orderId: ordenes[0].id, usage: null, consumedBy: 'Juan Pérez' },
      { materialId: materiales['IN-002'], quantity: 12,  orderId: null, usage: 'Sazonado lote de carne molida', consumedBy: 'Ana Torres' },
    ],
  })
  console.log('✅ Ingresos y consumos demo creados')

  // ── Guías de despacho (del día) ──
  const at = (h: number, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d }
  const despachosData = [
    { guideNumber: 'GD-2026-0001', client: 'Jumbo (Cencosud)',                 product: 'Carne Molida Especial 500g', quantityKg: 850,  transporter: 'Transportes FríoExpress', plate: 'JKLM-12', clientPO: 'OC-44012', orderId: ordenes[0].id, estimatedAt: at(8, 15),  dispatchedAt: at(8, 22), deliveredAt: at(10, 5), status: DispatchStatus.ENTREGADO },
    { guideNumber: 'GD-2026-0002', client: 'Supermercados Líder (Walmart Chile)', product: 'Bistec de Paleta 1kg',    quantityKg: 620,  transporter: 'Transportes FríoExpress', plate: 'JKLM-12', clientPO: 'OC-1209',  orderId: ordenes[1].id, estimatedAt: at(11, 0),  dispatchedAt: at(11, 10), deliveredAt: null,     status: DispatchStatus.DESPACHADO },
    { guideNumber: 'GD-2026-0003', client: 'Unimarc',                          product: 'Carne Molida Corriente 1kg', quantityKg: 400,  transporter: 'Rutas del Sur',           plate: 'PRST-34', clientPO: 'OC-77310', orderId: ordenes[4].id, estimatedAt: at(13, 30), dispatchedAt: null,      deliveredAt: null,     status: DispatchStatus.LISTO },
    { guideNumber: 'GD-2026-0004', client: 'FoodService Central',              product: 'Recorte Magro (granel)',     quantityKg: 1200, transporter: 'Logística Norte SpA',     plate: 'WXYZ-56', clientPO: 'OC-5582',  orderId: ordenes[3].id, estimatedAt: at(15, 0),  dispatchedAt: null,      deliveredAt: null,     status: DispatchStatus.PREPARANDO },
    { guideNumber: 'GD-2026-0005', client: 'Mayorista 10',                     product: 'Vacío al Vacío 1kg',         quantityKg: 300,  transporter: 'Rutas del Sur',           plate: 'PRST-34', clientPO: 'OC-8841',  orderId: ordenes[2].id, estimatedAt: at(9, 45),  dispatchedAt: at(9, 50), deliveredAt: at(12, 0), status: DispatchStatus.ENTREGADO },
  ]
  for (const d of despachosData) {
    await prisma.dispatch.create({ data: d })
  }
  console.log(`✅ Guías de despacho creadas: ${despachosData.length}`)

  // ── No Conformidades (planta cárnica) ──
  const ncDay = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(12, 0, 0, 0); return d }
  const ncsData = [
    {
      ncNumber: 'NC-2026-0001', area: 'Refrigeración', category: NcCategory.INOCUIDAD, severity: NcSeverity.CRITICA,
      status: NcStatus.EN_INVESTIGACION, title: 'Temperatura de cámara frigorífica fuera de rango',
      description: 'La cámara de producto terminado registró +4°C cuando el límite es ≤2°C durante el turno noche. Producto trasladado a cámara de respaldo y bajo evaluación.',
      rootCause: 'Falla en compresor de cámara.',
      correctiveAction: null, responsible: 'Pedro Soto', dueDate: ncDay(3), createdBy: 'Supervisor 1', createdAt: ncDay(-3),
      history: [
        { toStatus: NcStatus.ABIERTA, changedBy: 'Supervisor 1', note: 'No conformidad creada', createdAt: ncDay(-3) },
        { fromStatus: NcStatus.ABIERTA, toStatus: NcStatus.EN_INVESTIGACION, changedBy: 'Supervisor 1', note: 'Asignado a mantención para revisión del compresor', createdAt: ncDay(-2) },
      ],
    },
    {
      ncNumber: 'NC-2026-0002', area: 'Calidad', category: NcCategory.CALIDAD, severity: NcSeverity.MAYOR,
      status: NcStatus.ACCION_CORRECTIVA, title: 'Lote de carne molida con exceso de grasa',
      description: 'El lote de Carne Molida Corriente 1kg presentó % de grasa por sobre la especificación (28% vs. 20% objetivo) en el muestreo de control de proceso.',
      rootCause: 'Variación en materia prima (recorte 70/30 con mayor proporción de grasa).',
      correctiveAction: 'Reformulación del blend de molienda y ajuste del control de recepción de recortes por % de grasa.',
      responsible: 'Ana Torres', dueDate: ncDay(6), createdBy: 'Supervisor 2', createdAt: ncDay(-5),
      history: [
        { toStatus: NcStatus.ABIERTA, changedBy: 'Supervisor 2', note: 'No conformidad creada', createdAt: ncDay(-5) },
        { fromStatus: NcStatus.ABIERTA, toStatus: NcStatus.EN_INVESTIGACION, changedBy: 'Supervisor 2', note: null, createdAt: ncDay(-4) },
        { fromStatus: NcStatus.EN_INVESTIGACION, toStatus: NcStatus.ACCION_CORRECTIVA, changedBy: 'Supervisor 2', note: 'Causa identificada, ejecutando acción correctiva', createdAt: ncDay(-2) },
      ],
    },
    {
      ncNumber: 'NC-2026-0003', area: 'Envasado', category: NcCategory.PROCESO, severity: NcSeverity.MAYOR,
      status: NcStatus.ABIERTA, title: 'Etiquetado incorrecto en Bistec de Paleta',
      description: 'Se detectó peso neto erróneo impreso en etiquetas de Bistec de Paleta 1kg (indicaba 900g). Lote retenido para reetiquetado.',
      rootCause: null, correctiveAction: null, responsible: 'Luis Rojas', dueDate: ncDay(4), createdBy: 'Operador 3', createdAt: ncDay(-1),
      history: [
        { toStatus: NcStatus.ABIERTA, changedBy: 'Operador 3', note: 'No conformidad creada', createdAt: ncDay(-1) },
      ],
    },
    {
      ncNumber: 'NC-2026-0004', area: 'Recepción MP', category: NcCategory.PROVEEDOR, severity: NcSeverity.CRITICA,
      status: NcStatus.ABIERTA, title: 'Recepción de materia prima con temperatura de ingreso fuera de rango',
      description: 'Media Res Vacuno recibida a 8°C (debe ser ≤4°C). Lote aislado y notificado al proveedor para evaluación de aceptación/rechazo.',
      rootCause: null, correctiveAction: null, responsible: 'Ana Torres', dueDate: ncDay(-1), createdBy: 'Operador 2', createdAt: ncDay(-2),
      history: [
        { toStatus: NcStatus.ABIERTA, changedBy: 'Operador 2', note: 'No conformidad creada', createdAt: ncDay(-2) },
      ],
    },
    {
      ncNumber: 'NC-2026-0005', area: 'Producción', category: NcCategory.PROCESO, severity: NcSeverity.MENOR,
      status: NcStatus.CERRADA, title: 'Rotura de bolsa de vacío en línea Skin',
      description: 'Se detectaron bolsas de vacío con sello deficiente en la línea Skin, generando pérdida de vacío en aproximadamente 30 unidades.',
      rootCause: 'Variación de temperatura en la barra selladora tras cambio de turno.',
      correctiveAction: 'Recalibración de la selladora y reproceso de las unidades afectadas. Verificación de sello añadida al checklist de inicio de turno.',
      responsible: 'Juan Pérez', dueDate: ncDay(-4), createdBy: 'Supervisor 2', createdAt: ncDay(-9), closedAt: ncDay(-4),
      history: [
        { toStatus: NcStatus.ABIERTA, changedBy: 'Supervisor 2', note: 'No conformidad creada', createdAt: ncDay(-9) },
        { fromStatus: NcStatus.ABIERTA, toStatus: NcStatus.EN_INVESTIGACION, changedBy: 'Supervisor 2', note: null, createdAt: ncDay(-7) },
        { fromStatus: NcStatus.EN_INVESTIGACION, toStatus: NcStatus.ACCION_CORRECTIVA, changedBy: 'Supervisor 2', note: 'Causa identificada', createdAt: ncDay(-6) },
        { fromStatus: NcStatus.ACCION_CORRECTIVA, toStatus: NcStatus.CERRADA, changedBy: 'Administrador', note: 'Verificada eficacia, sin reincidencia', createdAt: ncDay(-4) },
      ],
    },
    {
      ncNumber: 'NC-2026-0006', area: 'Despacho', category: NcCategory.PROCESO, severity: NcSeverity.MENOR,
      status: NcStatus.CERRADA, title: 'Retraso en despacho a Jumbo por falta de cajas',
      description: 'El despacho a Jumbo se retrasó 1.5 horas por quiebre de stock de Caja Cartón 10kg en bodega de embalaje.',
      rootCause: 'Error operacional en el control de stock mínimo de embalaje.',
      correctiveAction: 'Reposición de cajas y ajuste del punto de reorden de embalaje en el sistema.',
      responsible: 'Pedro Soto', dueDate: ncDay(-2), createdBy: 'Supervisor 1', createdAt: ncDay(-6), closedAt: ncDay(-2),
      history: [
        { toStatus: NcStatus.ABIERTA, changedBy: 'Supervisor 1', note: 'No conformidad creada', createdAt: ncDay(-6) },
        { fromStatus: NcStatus.ABIERTA, toStatus: NcStatus.EN_INVESTIGACION, changedBy: 'Supervisor 1', note: null, createdAt: ncDay(-5) },
        { fromStatus: NcStatus.EN_INVESTIGACION, toStatus: NcStatus.ACCION_CORRECTIVA, changedBy: 'Supervisor 1', note: 'Reposición en curso', createdAt: ncDay(-3) },
        { fromStatus: NcStatus.ACCION_CORRECTIVA, toStatus: NcStatus.CERRADA, changedBy: 'Administrador', note: 'Punto de reorden ajustado', createdAt: ncDay(-2) },
      ],
    },
  ]
  for (const { history, ...nc } of ncsData) {
    await prisma.nonConformity.create({ data: { ...nc, history: { create: history } } })
  }
  console.log(`✅ No conformidades creadas: ${ncsData.length}`)

  // ── Capacidad: configuración por línea ──
  // kgPerHour = capacidad nominal del catálogo Control de Turno.
  const capacidadesData = [
    { lineId: L('CARNICERIA'), kgPerHour: 100,  hoursPerShift: 8, activeShifts: 2, efficiency: 78 }, // 100 Kg/HH base
    { lineId: L('L4'),         kgPerHour: 800,  hoursPerShift: 8, activeShifts: 2, efficiency: 85 },
    { lineId: L('L5'),         kgPerHour: 500,  hoursPerShift: 8, activeShifts: 2, efficiency: 80 },
    { lineId: L('SKIN'),       kgPerHour: 400,  hoursPerShift: 8, activeShifts: 1, efficiency: 70 },
    { lineId: L('MILANESAS'),  kgPerHour: 350,  hoursPerShift: 8, activeShifts: 1, efficiency: 75 },
    { lineId: L('MOLIENDA'),   kgPerHour: 2700, hoursPerShift: 8, activeShifts: 1, efficiency: 80 },
    { lineId: L('LM1'),        kgPerHour: 3000, hoursPerShift: 8, activeShifts: 1, efficiency: 85 },
    { lineId: L('LM2'),        kgPerHour: 3000, hoursPerShift: 8, activeShifts: 0, efficiency: 0 },  // detenida
  ]
  await prisma.lineCapacity.createMany({ data: capacidadesData })
  console.log(`✅ Configuraciones de capacidad creadas: ${capacidadesData.length}`)

  // ── Capacidad: plan de demanda del mes actual ──
  const planYear = new Date().getFullYear()
  const planMonth = new Date().getMonth() + 1
  const planDays = new Date(planYear, planMonth, 0).getDate()
  const planWeeks = Math.ceil(planDays / 7)
  // Demanda por línea y semana (la semana en curso refleja distintos estados de ocupación)
  const demandaPorLinea: Record<string, number[]> = {
    [L('CARNICERIA')]: [60000,  62000,  64000,  61000,  50000],  // ~80%
    [L('L4')]:         [143000, 148000, 151000, 146000, 120000], // ~95% (sobrecargada)
    [L('L5')]:         [70000,  72000,  75000,  73000,  60000],  // ~84%
    [L('SKIN')]:       [20000,  22000,  21000,  21000,  18000],  // ~67%
    [L('MILANESAS')]:  [12000,  13000,  12500,  12000,  10000],  // holgura
    [L('MOLIENDA')]:   [130000, 135000, 132000, 128000, 110000], // ~75%
    [L('LM1')]:        [155000, 160000, 158000, 152000, 130000], // ~82%
    [L('LM2')]:        [0,      0,      0,      0,      0],       // detenida
  }
  const demandCells = []
  for (const lineId of Object.keys(demandaPorLinea)) {
    for (let w = 1; w <= planWeeks; w++) {
      demandCells.push({ lineId, year: planYear, month: planMonth, week: w, demandKg: demandaPorLinea[lineId][w - 1] ?? 0 })
    }
  }
  await prisma.demandPlan.createMany({ data: demandCells })
  console.log(`✅ Plan de demanda creado: ${demandCells.length} celdas (${planWeeks} semanas)`)

  // ── Alertas: configuración de umbrales (singleton) ──
  // Umbrales reales para planta cárnica.
  await prisma.alertConfig.create({
    data: {
      oeeMinDefault: 70,      // alerta si el OEE de una línea cae bajo 70%
      expiryWarningDays: 3,   // días de anticipación para alerta de vencimiento de MP
      dispatchDelayHours: 2,  // tolerancia de retraso de despacho
      capacityOverPct: 90,    // ocupación que dispara alerta de capacidad
    },
  })
  console.log('✅ Configuración de umbrales de alertas creada')

  // ── Alertas: historial de alertas ya resueltas (para poblar /alertas/historial) ──
  // Las alertas ACTIVAS se generan automáticamente desde el estado actual de los
  // módulos al abrir el módulo de Alertas; aquí solo sembramos historial resuelto.
  const hAgo = (h: number) => new Date(Date.now() - h * 3600_000)
  const historialAlertas = [
    { sourceKey: `HIST:PROD:OEE_LOW:${L('L5')}`, module: AlertModule.PRODUCCION, type: 'OEE_BAJO', severity: AlertSeverity.ADVERTENCIA,
      title: 'OEE bajo en Línea 5', description: 'El OEE de Línea 5 cayó a 58% por microparadas en la envasadora.',
      responsible: 'Supervisor de Línea', acknowledgedBy: 'María González', acknowledgedAt: hAgo(50),
      resolvedBy: 'María González', resolutionNote: 'Recalibración de selladora, OEE normalizado.', createdAt: hAgo(51), resolvedAt: hAgo(49.5) },
    { sourceKey: `HIST:DESP:DELAY:past1`, module: AlertModule.DESPACHO, type: 'GUIA_RETRASADA', severity: AlertSeverity.CRITICA,
      title: 'Despacho retrasado: GD-2026-0099', description: 'La guía a Jumbo superó su hora estimada por quiebre de cajas de embalaje.',
      responsible: 'Coordinador de Despacho', acknowledgedBy: 'Pedro Soto', acknowledgedAt: hAgo(30),
      resolvedBy: 'Pedro Soto', resolutionNote: 'Reposición de cajas, guía despachada.', createdAt: hAgo(30.4), resolvedAt: hAgo(29.7) },
    { sourceKey: `HIST:MP:STOCK_LOW:past1`, module: AlertModule.MATERIAS_PRIMAS, type: 'STOCK_BAJO', severity: AlertSeverity.ADVERTENCIA,
      title: 'Stock bajo: Recorte Vacuno 90/10', description: 'El stock cayó bajo el mínimo previo a la recepción del lote.',
      responsible: 'Encargado de Bodega', acknowledgedBy: 'Pedro Soto', acknowledgedAt: hAgo(72),
      resolvedBy: 'Carlos Reyes', resolutionNote: 'Ingreso de lote regularizó el inventario.', createdAt: hAgo(73), resolvedAt: hAgo(70.5) },
    { sourceKey: `HIST:NC:CRITICAL_OPEN:past1`, module: AlertModule.NO_CONFORMIDADES, type: 'NC_CRITICA_ABIERTA', severity: AlertSeverity.CRITICA,
      title: 'NC crítica abierta: NC-2026-0098', description: 'Desviación crítica de temperatura en cámara frigorífica.',
      responsible: 'Pedro Soto', acknowledgedBy: 'María González', acknowledgedAt: hAgo(20),
      resolvedBy: 'María González', resolutionNote: 'NC cerrada tras reparación de compresor verificada.', createdAt: hAgo(20.2), resolvedAt: hAgo(19.5) },
    { sourceKey: `HIST:CAP:OVER:${L('L4')}`, module: AlertModule.CAPACIDAD, type: 'OCUPACION_ALTA', severity: AlertSeverity.ADVERTENCIA,
      title: 'Línea sobrecargada: Línea 4', description: 'Ocupación de 96% en la semana anterior.',
      responsible: 'Planificación', acknowledgedBy: 'Carlos Reyes', acknowledgedAt: hAgo(120),
      resolvedBy: 'Carlos Reyes', resolutionNote: 'Demanda redistribuida a Línea 5.', createdAt: hAgo(121), resolvedAt: hAgo(115) },
    { sourceKey: `HIST:PROD:LINE_STOPPED:past1`, module: AlertModule.PRODUCCION, type: 'LINEA_DETENIDA', severity: AlertSeverity.CRITICA,
      title: 'Línea Molida 2 detenida', description: 'Parada no planificada por limpieza CIP fuera de programa.',
      responsible: 'Jefe de Producción', acknowledgedBy: 'Pedro Soto', acknowledgedAt: hAgo(8),
      resolvedBy: 'Pedro Soto', resolutionNote: 'Limpieza finalizada, línea reanudada.', createdAt: hAgo(8.3), resolvedAt: hAgo(7.9) },
  ]
  await prisma.alert.createMany({
    data: historialAlertas.map((a) => ({ ...a, status: AlertStatus.RESUELTA, autoResolved: false })),
  })
  console.log(`✅ Historial de alertas resueltas creado: ${historialAlertas.length}`)

  // ── Control de Turno: programa del día, registros, batches, paradas y OEE ──
  const t = (h: number, m = 0) => { const d = new Date(hoy); d.setHours(h, m, 0, 0); return d }
  const archivo = `Programa_Diario_${hoy.toISOString().slice(0, 10)}.xlsx`

  // Variante A — Carnicería
  await prisma.programaDiario.create({
    data: {
      fecha: hoy, lineaId: L('CARNICERIA'), turno: Shift.MANANA, archivoNombre: archivo, creadoPor: 'María González',
      registros: {
        create: [
          { lineaId: L('CARNICERIA'), sku: 'BT-PAL', productoNombre: 'Bistec de Paleta 1kg',   turno: Shift.MANANA, fecha: hoy, dotacion: 4, kgPlan: 1800, rendTeoricoPorc: 72, horaInicio: t(8, 0),  horaTermino: t(10, 30), kgReal: 1750, estado: RegistroEstado.COMPLETADO },
          { lineaId: L('CARNICERIA'), sku: 'BT-PIE', productoNombre: 'Bistec de Pierna 500g',   turno: Shift.MANANA, fecha: hoy, dotacion: 4, kgPlan: 1500, rendTeoricoPorc: 70, horaInicio: t(10, 30), kgReal: 680, estado: RegistroEstado.EN_PROCESO },
          { lineaId: L('CARNICERIA'), sku: 'BT-PLA', productoNombre: 'Bistec Plateada Fina 300g', turno: Shift.MANANA, fecha: hoy, dotacion: 3, kgPlan: 800,  rendTeoricoPorc: 68, estado: RegistroEstado.PENDIENTE },
        ],
      },
    },
  })

  // Variante B — Línea 4 (envasado)
  await prisma.programaDiario.create({
    data: {
      fecha: hoy, lineaId: L('L4'), turno: Shift.MANANA, archivoNombre: archivo, creadoPor: 'María González',
      registros: {
        create: [
          { lineaId: L('L4'), productoNombre: 'Carne Molida Especial 500g', turno: Shift.MANANA, fecha: hoy, kgPlan: 4000, pesoUnitarioKg: 0.5, rentapacks: 6400, kgReal: 3200, horaInicio: t(8, 0),  horaTermino: t(12, 30), estado: RegistroEstado.COMPLETADO },
          { lineaId: L('L4'), productoNombre: 'Carne Molida Corriente 1kg', turno: Shift.MANANA, fecha: hoy, kgPlan: 2400, pesoUnitarioKg: 1,   rentapacks: 2000, kgReal: 2000, horaInicio: t(12, 30), estado: RegistroEstado.EN_PROCESO },
        ],
      },
    },
  })

  // Variante C — Molienda (batches secuenciales, objetivo 25 min)
  const moliendaProg = await prisma.programaDiario.create({
    data: { fecha: hoy, lineaId: L('MOLIENDA'), turno: Shift.MANANA, archivoNombre: archivo, creadoPor: 'María González' },
  })
  const moliendaReg = await prisma.registroProduccion.create({
    data: {
      programaId: moliendaProg.id, lineaId: L('MOLIENDA'), productoNombre: 'Molienda Carne Vacuno', turno: Shift.MANANA, fecha: hoy,
      kgPlan: 21600, horaInicio: t(8, 0), estado: RegistroEstado.EN_PROCESO,
      batches: {
        create: [
          { numeroBatch: 1, kgBatch: 2700, horaInicio: t(8, 0),  horaTermino: t(8, 23), duracionMinutos: 23, estado: RegistroEstado.COMPLETADO },
          { numeroBatch: 2, kgBatch: 2700, horaInicio: t(8, 23), horaTermino: t(8, 50), duracionMinutos: 27, observacion: 'Atasco menor en tolva', estado: RegistroEstado.COMPLETADO },
          { numeroBatch: 3, kgBatch: 2700, horaInicio: t(8, 50), horaTermino: t(9, 12), duracionMinutos: 22, estado: RegistroEstado.COMPLETADO },
          { numeroBatch: 4, kgBatch: 2700, horaInicio: t(9, 12), estado: RegistroEstado.EN_PROCESO },
          { numeroBatch: 5, kgBatch: 2700, estado: RegistroEstado.PENDIENTE },
          { numeroBatch: 6, kgBatch: 2700, estado: RegistroEstado.PENDIENTE },
          { numeroBatch: 7, kgBatch: 2700, estado: RegistroEstado.PENDIENTE },
          { numeroBatch: 8, kgBatch: 2700, estado: RegistroEstado.PENDIENTE },
        ],
      },
    },
  })
  void moliendaReg

  // Paradas del turno (Línea 4)
  await prisma.paradaTurno.createMany({
    data: [
      { lineaId: L('L4'), fecha: hoy, turno: Shift.MANANA, motivo: 'Cambio de formato', duracionMin: 20, registradoPor: 'María González' },
      { lineaId: L('L4'), fecha: hoy, turno: Shift.MANANA, motivo: 'Limpieza CIP',       duracionMin: 15, registradoPor: 'María González' },
    ],
  })

  // OEE por turno (pre-calculado para el resumen; se recalcula al cerrar turno)
  await prisma.oEETurno.createMany({
    data: [
      { lineaId: L('CARNICERIA'), fecha: hoy, turno: Shift.MANANA, disponibilidad: 95.8, rendimiento: 88.2, calidad: 96.1, oee: 81.2, totalParadasMin: 20, kgReal: 2430, kgTeorico: 2680, capacidadNominal: 400,  clasificacion: 'BUENO' },
      { lineaId: L('L4'),         fecha: hoy, turno: Shift.MANANA, disponibilidad: 92.7, rendimiento: 87.6, calidad: 92.0, oee: 74.7, totalParadasMin: 35, kgReal: 5200, kgTeorico: 5933, capacidadNominal: 800,  clasificacion: 'BUENO' },
      { lineaId: L('L5'),         fecha: hoy, turno: Shift.MANANA, disponibilidad: 96.9, rendimiento: 80.0, calidad: 94.0, oee: 72.9, totalParadasMin: 15, kgReal: 3100, kgTeorico: 3877, capacidadNominal: 500,  clasificacion: 'BUENO' },
      { lineaId: L('MOLIENDA'),   fecha: hoy, turno: Shift.MANANA, disponibilidad: 97.9, rendimiento: 82.0, calidad: 99.0, oee: 79.5, totalParadasMin: 10, kgReal: 8100, kgTeorico: 9878, capacidadNominal: 2700, clasificacion: 'BUENO' },
      { lineaId: L('LM1'),        fecha: hoy, turno: Shift.MANANA, disponibilidad: 98.0, rendimiento: 90.0, calidad: 98.0, oee: 86.5, totalParadasMin: 10, kgReal: 21000, kgTeorico: 23275, capacidadNominal: 3000, clasificacion: 'CLASE_MUNDIAL' },
    ],
  })
  console.log('✅ Control de Turno: programa, registros, batches, paradas y OEE creados')

  // ── Catálogo de cortes Carnicería (17 productos de referencia) ──
  const catalogoCortes = [
    { sku: '1997791', nombre: 'Bistec Posta Negra ATM S',        rendimientoTeorico: 47, productividadObjetivo: 60 },
    { sku: '1995237', nombre: 'Bistec Posta Negra ATM J',        rendimientoTeorico: 47, productividadObjetivo: 60 },
    { sku: '1995694', nombre: 'Bistec Asiento ATM J',            rendimientoTeorico: 46, productividadObjetivo: 60 },
    { sku: '1997790', nombre: 'Bistec Posta Rosada ATM S',       rendimientoTeorico: 48, productividadObjetivo: 60 },
    { sku: '1995236', nombre: 'Bistec Posta Rosada ATM J',       rendimientoTeorico: 48, productividadObjetivo: 60 },
    { sku: '1997789', nombre: 'Bistec Posta Paleta ATM S',       rendimientoTeorico: 40, productividadObjetivo: 45 },
    { sku: '1995235', nombre: 'Bistec Posta Paleta ATM J',       rendimientoTeorico: 40, productividadObjetivo: 45 },
    { sku: '1995233', nombre: 'Bistec Ganso ATM J',              rendimientoTeorico: 50, productividadObjetivo: 60 },
    { sku: '1995234', nombre: 'Bistec Lomo Liso ATM J',          rendimientoTeorico: 50, productividadObjetivo: 60 },
    { sku: '1995696', nombre: 'Escalopa Posta Negra Jumbo',      rendimientoTeorico: 43, productividadObjetivo: 60 },
    { sku: '1997257', nombre: 'Escalopa Posta Negra ATM S',      rendimientoTeorico: 43, productividadObjetivo: 60 },
    { sku: '1997788', nombre: 'Escalopa Ganso ATM S',            rendimientoTeorico: 50, productividadObjetivo: 60 },
    { sku: '1995232', nombre: 'Carne Filete Desgrasado ATM J',   rendimientoTeorico: 45, productividadObjetivo: 60 },
    { sku: '1996519', nombre: 'Carne Asiento Desgrasado ATM J',  rendimientoTeorico: 48, productividadObjetivo: 60 },
    { sku: '1998537', nombre: 'Carne Posta Negra Desgr. ATM J',  rendimientoTeorico: 48, productividadObjetivo: 60 },
    { sku: '1996518', nombre: 'Carne Lomo Liso Desgr. ATM J',    rendimientoTeorico: 45, productividadObjetivo: 60 },
    { sku: '2040862', nombre: 'Carne Tartar Asiento 200g',       rendimientoTeorico: 40, productividadObjetivo: 45 },
  ]
  const clienteFromNombre = (n: string) => {
    if (/jumbo/i.test(n) || /\bATM J\b/.test(n) || /\bJ$/.test(n)) return 'JUMBO'
    if (/\bATM S\b/.test(n) || /\bS$/.test(n)) return 'SISA'
    return null
  }
  await prisma.catalogoCortesCarniceria.createMany({
    data: catalogoCortes.map((c) => ({ ...c, cliente: clienteFromNombre(c.nombre), activo: true })),
  })
  console.log(`✅ Catálogo de cortes Carnicería creado: ${catalogoCortes.length}`)

  // ── Programa demo Carnicería (hoy, turno mañana, dotación 4) ──
  const mpTeo = (kgPT: number, rend: number) => Math.round((kgPT / (rend / 100)) * 10) / 10
  await prisma.programaCarniceria.create({
    data: {
      fecha: hoy, turno: Shift.MANANA, dotacion: 4, archivoNombre: archivo, creadoPor: 'María González',
      cortes: {
        create: [
          { sku: '1995237', nombre: 'Bistec Posta Negra ATM J', orden: 1, kgPTPlan: 56, kgMPTeorico: mpTeo(56, 47), rendTeorico: 47, prodObjetivo: 60, hiTeorico: '07:00', htTeorico: '07:30',
            horaInicio: t(7, 0), horaTermino: t(7, 30), kgMPReal: 120, kgPTReal: 55, hhReales: 2, prodReal: 60, rendReal: 45.8, estado: RegistroEstado.COMPLETADO, registradoPor: 'Juan Pérez' },
          { sku: '1995236', nombre: 'Bistec Posta Rosada ATM J', orden: 2, kgPTPlan: 60, kgMPTeorico: mpTeo(60, 48), rendTeorico: 48, prodObjetivo: 60, hiTeorico: '07:30', htTeorico: '08:05',
            horaInicio: t(7, 30), horaTermino: t(8, 5), kgMPReal: 130, kgPTReal: 60, hhReales: 2.33, prodReal: 55.8, rendReal: 46.2, estado: RegistroEstado.COMPLETADO, registradoPor: 'Juan Pérez' },
          { sku: '1995235', nombre: 'Bistec Posta Paleta ATM J', orden: 3, kgPTPlan: 45, kgMPTeorico: mpTeo(45, 40), rendTeorico: 40, prodObjetivo: 45, hiTeorico: '08:05', htTeorico: '08:45',
            horaInicio: t(8, 5), estado: RegistroEstado.EN_PROCESO, registradoPor: 'Juan Pérez' },
          { sku: '1995233', nombre: 'Bistec Ganso ATM J', orden: 4, kgPTPlan: 70, kgMPTeorico: mpTeo(70, 50), rendTeorico: 50, prodObjetivo: 60, hiTeorico: '08:45', htTeorico: '09:20', estado: RegistroEstado.PENDIENTE },
          { sku: '1995694', nombre: 'Bistec Asiento ATM J', orden: 5, kgPTPlan: 50, kgMPTeorico: mpTeo(50, 46), rendTeorico: 46, prodObjetivo: 60, hiTeorico: '09:20', htTeorico: '09:55', estado: RegistroEstado.PENDIENTE },
        ],
      },
    },
  })
  console.log('✅ Programa demo Carnicería creado (5 cortes)')

  // ── Configuración de turnos Carnicería (C1/C2/C3) ──
  // Arrays por día Lun..Sáb (índice 0..5). "" / 0 = no trabaja.
  await prisma.configuracionTurnos.createMany({
    data: [
      {
        lineaId: L('CARNICERIA'), turnoNombre: 'C1', cantPersonas: 12, orden: 1, colacionMin: 30, activo: true,
        entradas: ['07:00', '07:00', '07:00', '07:00', '07:00', '07:00'],
        salidas:  ['13:00', '15:00', '16:30', '16:30', '13:00', '13:00'],
        hhPorDia: [5.5, 7.5, 9.0, 9.0, 5.5, 5.5],
      },
      {
        lineaId: L('CARNICERIA'), turnoNombre: 'C2', cantPersonas: 4, orden: 2, colacionMin: 30, activo: true,
        entradas: ['07:00', '07:00', '07:00', '07:00', '07:00', ''],
        salidas:  ['14:00', '17:00', '16:30', '16:30', '15:30', ''],
        hhPorDia: [6.5, 9.5, 9.0, 9.0, 8.0, 0],
      },
      {
        lineaId: L('CARNICERIA'), turnoNombre: 'C3', cantPersonas: 1, orden: 3, colacionMin: 30, activo: true,
        entradas: ['07:30', '07:30', '07:30', '07:30', '07:30', '07:30'],
        salidas:  ['15:00', '15:00', '15:00', '15:00', '15:00', '15:00'],
        hhPorDia: [7.0, 7.0, 7.0, 7.0, 7.0, 7.0],
      },
    ],
  })
  console.log('✅ Configuración de turnos Carnicería creada (C1/C2/C3)')

  // ── Capacidad diaria histórica (últimos 90 días, Lun–Sáb) ──
  const PROD_NOMINAL = 100
  const hhByDay = [99, 135, 151, 151, 105, 73]          // Lun..Sáb
  const capByDay = hhByDay.map((hh) => hh * PROD_NOMINAL) // = [9900,13500,15100,15100,10500,7300]
  const estadoDe = (pct: number): CapacidadEstado => pct >= 100 ? CapacidadEstado.ESTRES : pct >= 90 ? CapacidadEstado.ALERTA : CapacidadEstado.HOLGURA
  const capDiariaData: {
    lineaId: string; fecha: Date; diaSemana: number; hhDisponibles: number; capacidadKgMP: number;
    pedidoKgMP: number; ocupacionPorc: number; holguraKgMP: number; estado: CapacidadEstado; prodRealKgHH: number
  }[] = []
  for (let d = 90; d >= 1; d--) {
    const fecha = new Date(hoy); fecha.setDate(fecha.getDate() - d)
    const jsDow = fecha.getDay() // 0=Dom..6=Sáb
    if (jsDow === 0) continue    // domingo no trabaja
    const idx = jsDow - 1        // 0=Lun..5=Sáb
    const cap = capByDay[idx]
    const hh = hhByDay[idx]
    // factor pseudoaleatorio determinista para variedad de estados
    const factor = 0.62 + ((d * 37) % 55) / 100  // 0.62 .. 1.16
    const pedido = Math.round(cap * factor)
    const pct = Math.round((pedido / cap) * 1000) / 10
    capDiariaData.push({
      lineaId: L('CARNICERIA'), fecha, diaSemana: idx + 1, hhDisponibles: hh, capacidadKgMP: cap,
      pedidoKgMP: pedido, ocupacionPorc: pct, holguraKgMP: cap - pedido, estado: estadoDe(pct),
      prodRealKgHH: Math.round((88 + ((d * 53) % 18)) * 10) / 10,
    })
  }
  await prisma.capacidadDiaria.createMany({ data: capDiariaData })
  console.log(`✅ Capacidad diaria histórica creada: ${capDiariaData.length} días`)

  console.log('\n🚀 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
