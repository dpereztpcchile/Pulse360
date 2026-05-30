import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductionTabs } from '@/components/produccion/ProductionTabs'
import { ShiftToggle } from '@/components/produccion/control-turno/ShiftToggle'
import { LineDetailClient } from '@/components/produccion/control-turno/LineDetailClient'
import { CarniceriaClient } from '@/components/produccion/control-turno/carniceria/CarniceriaClient'
import { getTurnoLine } from '@/lib/control-turno/config'
import { SinProgramaBanner } from '@/components/carga-programa/SinProgramaBanner'
import { dayBounds, buildOeeInput, type RegistroConBatches } from '@/lib/control-turno/service'
import { computeOee } from '@/lib/control-turno/oee'
import { GaugeCircle, CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

const VALID = ['MANANA', 'TARDE', 'NOCHE']
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const iso = (d: Date | null) => (d ? d.toISOString() : null)

export default async function LinePage({ params, searchParams }: { params: { code: string }; searchParams: { turno?: string } }) {
  const cat = getTurnoLine(params.code)
  if (!cat) notFound()

  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? 'OPERADOR'
  const user = session?.user?.name ?? 'Usuario'
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const turno = VALID.includes(searchParams.turno ?? '') ? searchParams.turno! : 'MANANA'
  const fecha = todayStr()
  const { start, end, day } = dayBounds(fecha)

  const line = await prisma.productionLine.findUnique({ where: { code: params.code }, select: { id: true, code: true, name: true } })
  if (!line) notFound()

  // ── Carnicería: experiencia dedicada (productividad sobre MP bruta) ──
  if (cat.variant === 'CARNICERIA') {
    const programaRaw = await prisma.programaCarniceria.findFirst({
      where: { fecha: { gte: start, lte: end }, turno: turno as never },
      include: { cortes: { orderBy: { orden: 'asc' } } },
    })
    const programa = programaRaw ? {
      id: programaRaw.id, fecha, dotacion: programaRaw.dotacion, turno: programaRaw.turno, archivoNombre: programaRaw.archivoNombre,
      cortes: programaRaw.cortes.map((c) => ({
        id: c.id, sku: c.sku, nombre: c.nombre, orden: c.orden,
        kgPTPlan: c.kgPTPlan, kgMPTeorico: c.kgMPTeorico, rendTeorico: c.rendTeorico, prodObjetivo: c.prodObjetivo,
        hiTeorico: c.hiTeorico, htTeorico: c.htTeorico, horaInicio: iso(c.horaInicio), horaTermino: iso(c.horaTermino),
        kgMPReal: c.kgMPReal, kgPTReal: c.kgPTReal, hhReales: c.hhReales, prodReal: c.prodReal, rendReal: c.rendReal,
        estado: c.estado, observaciones: c.observaciones,
      })),
    } : null

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GaugeCircle className="w-6 h-6 text-pulse-red" /> Producción
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Control de turno - Carnicería</p>
        </div>
        <ProductionTabs />
        <div className="flex items-center gap-1.5 text-sm text-[#999]">
          <CalendarDays className="w-4 h-4 text-pulse-red" /> {fecha}
        </div>
        <CarniceriaClient initialPrograma={programa} fecha={fecha} turno={turno} user={user} canManage={canManage} />
      </div>
    )
  }

  const [registrosRaw, paradasRaw, ncs] = await Promise.all([
    prisma.registroProduccion.findMany({
      where: { lineaId: line.id, fecha: { gte: start, lte: end }, turno: turno as never },
      include: { batches: { orderBy: { numeroBatch: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.paradaTurno.findMany({
      where: { lineaId: line.id, fecha: { gte: start, lte: end }, turno: turno as never },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.nonConformity.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: 'CERRADA' } },
      select: { area: true, title: true, description: true },
    }),
  ])

  const paradasMin = paradasRaw.reduce((a, p) => a + (p.duracionMin || 0), 0)

  // OEE en vivo
  let oeeView = null
  const input = buildOeeInput(cat.code, registrosRaw as RegistroConBatches[], paradasMin)
  if (input) {
    const r = computeOee(input)
    oeeView = {
      oee: r.oee, disponibilidad: r.disponibilidad, rendimiento: r.rendimiento, calidad: r.calidad,
      capacidadNominal: r.capacidadNominal, produccionTeoricaMax: r.produccionTeoricaMax,
      produccionReal: r.produccionReal, totalParadasMin: r.totalParadasMin,
    }
  }

  const registros = registrosRaw.map((r) => ({
    id: r.id, sku: r.sku, productoNombre: r.productoNombre, dotacion: r.dotacion,
    kgPlan: r.kgPlan, kgReal: r.kgReal, rentapacks: r.rentapacks, pesoUnitarioKg: r.pesoUnitarioKg,
    rendTeoricoPorc: r.rendTeoricoPorc, estado: r.estado, horaInicio: iso(r.horaInicio), horaTermino: iso(r.horaTermino),
    observaciones: r.observaciones,
    batches: r.batches.map((b) => ({
      id: b.id, numeroBatch: b.numeroBatch, horaInicio: iso(b.horaInicio), horaTermino: iso(b.horaTermino),
      kgBatch: b.kgBatch, duracionMinutos: b.duracionMinutos, observacion: b.observacion, estado: b.estado,
    })),
  }))

  const ncCount = ncs.filter((nc) => `${nc.area} ${nc.title} ${nc.description}`.toLowerCase().includes(line.name.toLowerCase())).length

  void day

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GaugeCircle className="w-6 h-6 text-pulse-red" /> Producción
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Control de turno</p>
      </div>

      <ProductionTabs />

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-[#999]">
          <CalendarDays className="w-4 h-4 text-pulse-red" /> {fecha}
        </span>
        <ShiftToggle turno={turno} />
      </div>

      {registros.length === 0 && <SinProgramaBanner mensaje="Sin programa para hoy en esta línea" />}

      <LineDetailClient
        line={{ id: line.id, code: line.code, name: line.name, variant: cat.variant, oeeEnabled: cat.oeeEnabled }}
        fecha={fecha}
        turno={turno}
        user={user}
        canManage={canManage}
        initialRegistros={registros}
        initialParadas={paradasRaw.map((p) => ({ motivo: p.motivo, duracionMin: p.duracionMin }))}
        initialOee={oeeView}
        ncCount={ncCount}
      />
    </div>
  )
}
