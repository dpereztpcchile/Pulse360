'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Loader2, AlertCircle } from 'lucide-react'
import { cn, ORDER_STATUS, SHIFT_LABELS, complianceColor } from '@/lib/utils'

interface Order {
  id: string
  orderNumber: string
  product: string
  lineId: string
  lineName: string
  shift: string
  date: string
  plannedKg: number
  realKg: number
  status: keyof typeof ORDER_STATUS
  responsible: string
  observations: string | null
}
interface Line { id: string; name: string }

const SHIFTS = ['MANANA', 'TARDE', 'NOCHE']
const STATUSES = ['PLANIFICADA', 'EN_PROCESO', 'COMPLETADA', 'DETENIDA'] as const

const emptyForm = {
  product: '', lineId: '', shift: 'MANANA', date: '', plannedKg: '',
  realKg: '', status: 'PLANIFICADA', responsible: '', observations: '',
}

export function OrdersClient({ initialOrders, lines, role }: { initialOrders: Order[]; lines: Line[]; role: string }) {
  const router = useRouter()
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const [fLine, setFLine] = useState('TODOS')
  const [fShift, setFShift] = useState('TODOS')
  const [fStatus, setFStatus] = useState('TODOS')
  const [fDate, setFDate] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    return initialOrders.filter((o) => {
      if (fLine !== 'TODOS' && o.lineId !== fLine) return false
      if (fShift !== 'TODOS' && o.shift !== fShift) return false
      if (fStatus !== 'TODOS' && o.status !== fStatus) return false
      if (fDate && o.date.slice(0, 10) !== fDate) return false
      return true
    })
  }, [initialOrders, fLine, fShift, fStatus, fDate])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, lineId: lines[0]?.id ?? '', date: new Date().toISOString().slice(0, 10) })
    setError('')
    setModalOpen(true)
  }

  function openEdit(o: Order) {
    setEditing(o)
    setForm({
      product: o.product, lineId: o.lineId, shift: o.shift, date: o.date.slice(0, 10),
      plannedKg: String(o.plannedKg), realKg: String(o.realKg), status: o.status,
      responsible: o.responsible, observations: o.observations ?? '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      let res: Response
      if (editing) {
        // Operador solo envía realKg + status; admin/supervisor envían todo
        const payload = canManage
          ? { product: form.product, lineId: form.lineId, shift: form.shift, date: form.date,
              plannedKg: Number(form.plannedKg), realKg: Number(form.realKg), status: form.status,
              responsible: form.responsible, observations: form.observations }
          : { realKg: Number(form.realKg), status: form.status }
        res = await fetch(`/api/production/orders/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/production/orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: form.product, lineId: form.lineId, shift: form.shift,
            date: form.date, plannedKg: Number(form.plannedKg), responsible: form.responsible,
            observations: form.observations }),
        })
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar'); setBusy(false); return
      }
      setModalOpen(false); router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros + acción */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
        <select value={fLine} onChange={(e) => setFLine(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todas las líneas</option>
          {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={fShift} onChange={(e) => setFShift(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todos los turnos</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{SHIFT_LABELS[s]}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
        {(fDate || fLine !== 'TODOS' || fShift !== 'TODOS' || fStatus !== 'TODOS') && (
          <button onClick={() => { setFDate(''); setFLine('TODOS'); setFShift('TODOS'); setFStatus('TODOS') }}
            className="text-xs text-[#666] hover:text-white transition-colors">Limpiar filtros</button>
        )}
        {canManage && (
          <button onClick={openCreate} className="btn-primary text-sm ml-auto">
            <Plus className="w-4 h-4" /> Nueva orden
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-left font-medium">Línea</th>
                <th className="px-4 py-3 text-left font-medium">Turno</th>
                <th className="px-4 py-3 text-right font-medium">Plan (kg)</th>
                <th className="px-4 py-3 text-right font-medium">Real (kg)</th>
                <th className="px-4 py-3 text-right font-medium">% Cumpl.</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Responsable</th>
                <th className="px-4 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-[#555]">Sin órdenes que coincidan</td></tr>
              )}
              {filtered.map((o) => {
                const pct = o.plannedKg > 0 ? Math.round((o.realKg / o.plannedKg) * 100) : 0
                return (
                  <tr key={o.id} className="hover:bg-border-dark/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#999]">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{o.product}</td>
                    <td className="px-4 py-3 text-[#999]">{o.lineName}</td>
                    <td className="px-4 py-3 text-[#999]">{SHIFT_LABELS[o.shift]}</td>
                    <td className="px-4 py-3 text-right text-white font-rajdhani font-semibold">{o.plannedKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-white font-rajdhani font-semibold">{o.realKg.toLocaleString()}</td>
                    <td className={cn('px-4 py-3 text-right font-rajdhani font-bold', complianceColor(pct))}>{pct}%</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', ORDER_STATUS[o.status].cls)}>
                        {ORDER_STATUS[o.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999]">{o.responsible}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(o)} title={canManage ? 'Editar' : 'Actualizar producción'}
                        className="p-1.5 rounded-lg text-[#888] hover:bg-border-dark hover:text-white transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg card border border-border-dark shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editing ? (canManage ? `Editar ${editing.orderNumber}` : `Actualizar ${editing.orderNumber}`) : 'Nueva orden de producción'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#666] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campos de gestión: admin/supervisor en crear y editar */}
              {canManage && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#ccc] mb-1.5">Producto</label>
                    <input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required placeholder="Ej. Carne Molida Especial 500g"
                      className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#ccc] mb-1.5">Línea</label>
                      <select value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
                        {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ccc] mb-1.5">Turno</label>
                      <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
                        {SHIFTS.map((s) => <option key={s} value={s}>{SHIFT_LABELS[s]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#ccc] mb-1.5">Fecha</label>
                      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required
                        className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ccc] mb-1.5">Cantidad planificada (kg)</label>
                      <input type="number" min="1" value={form.plannedKg} onChange={(e) => setForm({ ...form, plannedKg: e.target.value })} required
                        className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ccc] mb-1.5">Responsable</label>
                    <input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} required
                      className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ccc] mb-1.5">Observaciones</label>
                    <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={2} placeholder="Ej. Ajuste de molienda por temperatura MP, Cambio de cuchillas programado, Parada por limpieza CIP"
                      className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red resize-none" />
                  </div>
                </>
              )}

              {/* Producción real + estado: visible al editar (operador solo ve esto) */}
              {editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#ccc] mb-1.5">Producción real (kg)</label>
                    <input type="number" min="0" value={form.realKg} onChange={(e) => setForm({ ...form, realKg: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ccc] mb-1.5">Estado</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
                      {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {!canManage && !editing && (
                <p className="text-sm text-[#666]">No tienes permisos para crear órdenes.</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Guardar' : 'Crear orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
