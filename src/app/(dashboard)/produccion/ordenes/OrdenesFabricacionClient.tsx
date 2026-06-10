'use client'

import { useState, useMemo } from 'react'
import { Calendar, AlertTriangle, ClipboardList } from 'lucide-react'

export interface OF {
  id: string
  numeroOF: string
  producto: string
  cantidadPlanificada: number
  unidad: string | null
  cantidadCompletada: number
  razonQuiebre: string | null
  fecha: string
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

export function OrdenesFabricacionClient({ initialOrdenes }: { initialOrdenes: OF[] }) {
  const [ordenes, setOrdenes] = useState<OF[]>(initialOrdenes)
  const [fDate, setFDate] = useState('')

  const filtered = useMemo(
    () => (fDate ? ordenes.filter((o) => o.fecha.slice(0, 10) === fDate) : ordenes),
    [ordenes, fDate],
  )

  async function save(id: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/produccion/ordenes-fabricacion/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (res.ok) {
      const u = await res.json()
      setOrdenes((os) => os.map((o) => (o.id === id ? { ...o, cantidadCompletada: u.cantidadCompletada, razonQuiebre: u.razonQuiebre } : o)))
    }
  }

  return (
    <div className="space-y-5">
      {/* Filtro de fecha */}
      <div className="card p-4 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-[#999]"><Calendar className="w-4 h-4 text-pulse-red" /> Fecha</span>
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
          className="bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:border-pulse-red outline-none" />
        {fDate && <button onClick={() => setFDate('')} className="text-xs text-[#666] hover:text-white">Limpiar</button>}
        <span className="ml-auto text-xs text-[#666]">{filtered.length} OF</span>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-4 py-3 font-medium">OF</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium text-right">Cantidad Planificada</th>
              <th className="px-4 py-3 font-medium text-center">Cantidad Completada</th>
              <th className="px-4 py-3 font-medium text-center">% Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-[#555]">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 text-[#333]" />
                No hay órdenes de fabricación. Se cargan desde el Excel SAP en <b className="text-[#888]">Carga de Archivos</b>.
              </td></tr>
            ) : filtered.map((o) => <OrdenRow key={o.id} o={o} onSave={save} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrdenRow({ o, onSave }: { o: OF; onSave: (id: string, p: Record<string, unknown>) => void }) {
  // Una OF con 0 completado pero con razón guardada se considera "trabajada" (quiebre total) al recargar.
  const [comp, setComp] = useState(o.cantidadCompletada ? o.cantidadCompletada.toString() : (o.razonQuiebre ? '0' : ''))
  const [razon, setRazon] = useState(o.razonQuiebre ?? '')
  const compNum = comp === '' ? 0 : Number(comp)
  const pct = o.cantidadPlanificada > 0 ? (compNum / o.cantidadPlanificada) * 100 : 0
  // Sin datos = celda vacía (OF aún no trabajada) → neutro. Si se ingresa un valor (incluido 0) y < 95% → quiebre.
  const sinDatos = comp === ''
  const quiebre = !sinDatos && pct < 95
  const pctColor = sinDatos ? '#888888' : quiebre ? '#CC0000' : '#16a34a'

  return (
    <tr className="border-b border-border-dark hover:bg-white/[0.02] align-top">
      <td className="px-4 py-2.5 text-white font-medium whitespace-nowrap">{o.numeroOF}</td>
      <td className="px-4 py-2.5 text-[#ccc]">{o.producto}</td>
      <td className="px-4 py-2.5 text-right text-[#ccc] whitespace-nowrap">{fmt(o.cantidadPlanificada)} {o.unidad && <span className="text-[#777] text-xs">{o.unidad}</span>}</td>
      <td className="px-4 py-2.5 text-center">
        <input type="number" min="0" value={comp} onChange={(e) => setComp(e.target.value)}
          onBlur={() => { if (comp !== (o.cantidadCompletada ? o.cantidadCompletada.toString() : '')) onSave(o.id, { cantidadCompletada: comp === '' ? 0 : Number(comp) }) }}
          className="w-28 px-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-sm text-right focus:outline-none focus:border-pulse-red" />
      </td>
      <td className="px-4 py-2.5">
        <span className="flex items-center justify-end gap-1 font-semibold" style={{ color: pctColor }}>
          {quiebre && <AlertTriangle className="w-3.5 h-3.5" />}
          {pct.toFixed(1)}%
        </span>
        {quiebre && (
          <input type="text" value={razon} placeholder="Razón del quiebre…"
            onChange={(e) => setRazon(e.target.value)}
            onBlur={() => { if (razon !== (o.razonQuiebre ?? '')) onSave(o.id, { razonQuiebre: razon }) }}
            className="w-full mt-1.5 px-2 py-1 rounded bg-bg-dark border border-pulse-red/40 text-white text-xs focus:outline-none focus:border-pulse-red" />
        )}
      </td>
    </tr>
  )
}
