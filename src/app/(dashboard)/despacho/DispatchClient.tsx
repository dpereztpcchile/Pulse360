'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Loader2, AlertCircle, Truck, FileText, PackageCheck, Clock } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { cn, DISPATCH_STATUS, DISPATCH_STATUS_ORDER, formatTime, type DispatchStatusKey } from '@/lib/utils'

export interface Dispatch {
  id: string
  guideNumber: string
  client: string
  product: string
  quantityKg: number
  transporter: string
  plate: string | null
  clientPO: string | null
  orderId: string | null
  orderNumber: string | null
  estimatedAt: string
  dispatchedAt: string | null
  deliveredAt: string | null
  status: DispatchStatusKey
  observations: string | null
}
interface OrderOpt { id: string; orderNumber: string; product: string }

const emptyForm = {
  guideNumber: '', client: '', product: '', quantityKg: '', transporter: '',
  plate: '', clientPO: '', orderId: '', estimatedAt: '', observations: '',
}

export function DispatchClient({
  initialDispatches, orders, kpis, role,
}: {
  initialDispatches: Dispatch[]
  orders: OrderOpt[]
  kpis: { despachadoHoy: number; guiasEmitidas: number; pendientes: number; entregadas: number }
  role: string
}) {
  const router = useRouter()
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Dispatch | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)

  async function changeStatus(id: string, status: string) {
    setStatusBusyId(id)
    const res = await fetch(`/api/dispatch/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    setStatusBusyId(null)
    if (res.ok) router.refresh()
  }

  function openCreate() {
    setEditing(null)
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setForm({ ...emptyForm, estimatedAt: now.toISOString().slice(0, 16) })
    setError(''); setModalOpen(true)
  }

  function openEdit(d: Dispatch) {
    setEditing(d)
    const dt = new Date(d.estimatedAt); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset())
    setForm({
      guideNumber: d.guideNumber, client: d.client, product: d.product, quantityKg: String(d.quantityKg),
      transporter: d.transporter, plate: d.plate ?? '', clientPO: d.clientPO ?? '',
      orderId: d.orderId ?? '', estimatedAt: dt.toISOString().slice(0, 16), observations: d.observations ?? '',
    })
    setError(''); setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const payload = {
        client: form.client, product: form.product, quantityKg: Number(form.quantityKg),
        transporter: form.transporter, plate: form.plate, clientPO: form.clientPO,
        orderId: form.orderId || null, estimatedAt: form.estimatedAt, observations: form.observations,
      }
      let res: Response
      if (editing) {
        res = await fetch(`/api/dispatch/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/dispatch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, guideNumber: form.guideNumber }),
        })
      }
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar'); setBusy(false); return }
      setModalOpen(false); router.refresh()
    } catch { setError('Error de conexión') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Despachado Hoy" value={kpis.despachadoHoy.toLocaleString()} unit="kg" icon={Truck} status="ok" />
        <KPICard title="Guías Emitidas" value={kpis.guiasEmitidas} unit="" icon={FileText} status="neutral" />
        <KPICard title="Pendientes" value={kpis.pendientes} unit="" icon={Clock} status={kpis.pendientes > 0 ? 'warn' : 'ok'} />
        <KPICard title="Entregas Confirmadas" value={kpis.entregadas} unit="" icon={PackageCheck} status="ok" />
      </div>

      {/* Acción */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Guías del día</h2>
        {canManage && (
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Nueva guía
          </button>
        )}
      </div>

      {/* Tabla de guías del día */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">N° Guía</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                <th className="px-4 py-3 text-left font-medium">Hora est.</th>
                <th className="px-4 py-3 text-left font-medium">Transportista</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Cambiar estado</th>
                {canManage && <th className="px-4 py-3 text-right font-medium">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {initialDispatches.length === 0 && (
                <tr><td colSpan={canManage ? 9 : 8} className="px-4 py-10 text-center text-[#555]">Sin guías para hoy</td></tr>
              )}
              {initialDispatches.map((d) => {
                const st = DISPATCH_STATUS[d.status]
                return (
                  <tr key={d.id} className="hover:bg-border-dark/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#999]">{d.guideNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{d.client}</td>
                    <td className="px-4 py-3 text-[#999]">{d.product}</td>
                    <td className="px-4 py-3 text-right text-white font-rajdhani font-semibold">{d.quantityKg.toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-[#999] font-mono text-xs">{formatTime(d.estimatedAt)}</td>
                    <td className="px-4 py-3 text-[#999]">{d.transporter}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', st.cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {DISPATCH_STATUS_ORDER.map((s) => (
                          <button
                            key={s}
                            disabled={statusBusyId === d.id || d.status === s}
                            onClick={() => changeStatus(d.id, s)}
                            title={DISPATCH_STATUS[s].label}
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium transition-colors disabled:cursor-default',
                              d.status === s ? DISPATCH_STATUS[s].cls : 'text-[#666] hover:bg-border-dark hover:text-white'
                            )}
                          >
                            {DISPATCH_STATUS[s].label}
                          </button>
                        ))}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(d)} title="Editar guía"
                          className="p-1.5 rounded-lg text-[#888] hover:bg-border-dark hover:text-white transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar guía */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg card border border-border-dark shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editing ? `Editar ${editing.guideNumber}` : 'Nueva guía de despacho'}
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
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">N° Guía <span className="text-[#666] font-normal">(opcional, se autogenera)</span></label>
                  <input value={form.guideNumber} onChange={(e) => setForm({ ...form, guideNumber: e.target.value })} placeholder="GD-2026-0001"
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Cliente</label>
                  <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} required placeholder="Ej. Jumbo (Cencosud)"
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">N° OC cliente</label>
                  <input value={form.clientPO} onChange={(e) => setForm({ ...form, clientPO: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ccc] mb-1.5">Orden de producción vinculada</label>
                <select value={form.orderId} onChange={(e) => {
                    const o = orders.find((x) => x.id === e.target.value)
                    setForm({ ...form, orderId: e.target.value, product: o && !form.product ? o.product : form.product })
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
                  <option value="">— Sin vincular —</option>
                  {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} — {o.product}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Producto</label>
                  <input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required placeholder="Ej. Carne Molida Especial 500g"
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Cantidad (kg)</label>
                  <input type="number" min="1" step="any" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} required
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Transportista</label>
                  <input value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} required placeholder="Ej. Transportes FríoExpress"
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Patente</label>
                  <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ccc] mb-1.5">Fecha y hora estimada de despacho</label>
                <input type="datetime-local" value={form.estimatedAt} onChange={(e) => setForm({ ...form, estimatedAt: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ccc] mb-1.5">Observaciones</label>
                <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Guardar' : 'Crear guía'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
