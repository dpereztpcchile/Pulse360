'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackagePlus, MinusCircle, Loader2, AlertCircle, Thermometer } from 'lucide-react'
import { cn, formatDateTime, formatDate } from '@/lib/utils'

interface MaterialOpt { id: string; name: string; unit: string; currentStock: number }
interface OrderOpt { id: string; orderNumber: string; product: string }
interface Receipt {
  id: string; materialName: string; materialCode: string; unit: string; supplier: string
  quantity: number; lot: string | null; expiryDate: string | null; entryTemp: number | null
  receivedBy: string; createdAt: string
}
interface Consumption {
  id: string; materialName: string; unit: string; quantity: number
  orderNumber: string | null; usage: string | null; consumedBy: string; createdAt: string
}

export function IngresosClient({
  materials, orders, receipts, consumptions, userName, role,
}: {
  materials: MaterialOpt[]
  orders: OrderOpt[]
  receipts: Receipt[]
  consumptions: Consumption[]
  userName: string
  role: string
}) {
  const router = useRouter()
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const firstMat = materials[0]?.id ?? ''
  const [rForm, setRForm] = useState({
    materialId: firstMat, supplier: '', quantity: '', lot: '', expiryDate: '', entryTemp: '', receivedBy: userName,
  })
  const [rBusy, setRBusy] = useState(false)
  const [rError, setRError] = useState('')

  const [cMode, setCMode] = useState<'order' | 'general'>('order')
  const [cForm, setCForm] = useState({
    materialId: firstMat, quantity: '', orderId: orders[0]?.id ?? '', usage: '', consumedBy: userName,
  })
  const [cBusy, setCBusy] = useState(false)
  const [cError, setCError] = useState('')

  async function submitReceipt(e: React.FormEvent) {
    e.preventDefault()
    setRBusy(true); setRError('')
    try {
      const res = await fetch('/api/materials/receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rForm),
      })
      if (!res.ok) { const d = await res.json(); setRError(d.error ?? 'Error al registrar'); setRBusy(false); return }
      setRForm({ materialId: firstMat, supplier: '', quantity: '', lot: '', expiryDate: '', entryTemp: '', receivedBy: userName })
      router.refresh()
    } catch { setRError('Error de conexión') } finally { setRBusy(false) }
  }

  async function submitConsumption(e: React.FormEvent) {
    e.preventDefault()
    setCBusy(true); setCError('')
    try {
      const payload = {
        materialId: cForm.materialId,
        quantity: cForm.quantity,
        consumedBy: cForm.consumedBy,
        orderId: cMode === 'order' ? cForm.orderId : null,
        usage: cMode === 'general' ? cForm.usage : null,
      }
      const res = await fetch('/api/materials/consumptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json(); setCError(d.error ?? 'Error al registrar'); setCBusy(false); return }
      setCForm({ materialId: firstMat, quantity: '', orderId: orders[0]?.id ?? '', usage: '', consumedBy: userName })
      router.refresh()
    } catch { setCError('Error de conexión') } finally { setCBusy(false) }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red'
  const labelCls = 'block text-sm font-medium text-[#ccc] mb-1.5'

  return (
    <div className="space-y-6">
      {/* Formularios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registro de ingreso */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PackagePlus className="w-5 h-5 text-status-ok" />
            <h2 className="font-semibold text-white">Registrar ingreso</h2>
          </div>

          {!canManage ? (
            <p className="text-sm text-[#666]">No tienes permisos para registrar ingresos.</p>
          ) : (
            <form onSubmit={submitReceipt} className="space-y-3">
              {rError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {rError}
                </div>
              )}
              <div>
                <label className={labelCls}>Insumo</label>
                <select value={rForm.materialId} onChange={(e) => setRForm({ ...rForm, materialId: e.target.value })} className={inputCls}>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Proveedor</label>
                  <input value={rForm.supplier} onChange={(e) => setRForm({ ...rForm, supplier: e.target.value })} required placeholder="Ej. Frigorífico del Sur S.A." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cantidad</label>
                  <input type="number" min="0.01" step="any" value={rForm.quantity} onChange={(e) => setRForm({ ...rForm, quantity: e.target.value })} required className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Lote</label>
                  <input value={rForm.lot} onChange={(e) => setRForm({ ...rForm, lot: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha vencimiento</label>
                  <input type="date" value={rForm.expiryDate} onChange={(e) => setRForm({ ...rForm, expiryDate: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Temp. de ingreso (°C)</label>
                  <input type="number" step="any" value={rForm.entryTemp} onChange={(e) => setRForm({ ...rForm, entryTemp: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Recepcionado por</label>
                  <input value={rForm.receivedBy} onChange={(e) => setRForm({ ...rForm, receivedBy: e.target.value })} required className={inputCls} />
                </div>
              </div>
              <button type="submit" disabled={rBusy} className="btn-primary w-full justify-center text-sm disabled:opacity-60">
                {rBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PackagePlus className="w-4 h-4" /> Registrar ingreso</>}
              </button>
            </form>
          )}
        </div>

        {/* Registro de consumo */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MinusCircle className="w-5 h-5 text-pulse-red" />
            <h2 className="font-semibold text-white">Registrar consumo</h2>
          </div>

          <form onSubmit={submitConsumption} className="space-y-3">
            {cError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
                <AlertCircle className="w-4 h-4 shrink-0" /> {cError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Insumo</label>
                <select value={cForm.materialId} onChange={(e) => setCForm({ ...cForm, materialId: e.target.value })} className={inputCls}>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.currentStock.toLocaleString()} {m.unit})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min="0.01" step="any" value={cForm.quantity} onChange={(e) => setCForm({ ...cForm, quantity: e.target.value })} required className={inputCls} />
              </div>
            </div>

            {/* Selector de tipo de consumo */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setCMode('order')}
                className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  cMode === 'order' ? 'bg-pulse-red text-white' : 'bg-bg-dark text-[#999] border border-border-dark hover:text-white')}>
                Orden de producción
              </button>
              <button type="button" onClick={() => setCMode('general')}
                className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  cMode === 'general' ? 'bg-pulse-red text-white' : 'bg-bg-dark text-[#999] border border-border-dark hover:text-white')}>
                Uso general
              </button>
            </div>

            {cMode === 'order' ? (
              <div>
                <label className={labelCls}>Orden</label>
                <select value={cForm.orderId} onChange={(e) => setCForm({ ...cForm, orderId: e.target.value })} className={inputCls}>
                  {orders.length === 0 && <option value="">Sin órdenes activas</option>}
                  {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} — {o.product}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Descripción de uso</label>
                <input value={cForm.usage} onChange={(e) => setCForm({ ...cForm, usage: e.target.value })} placeholder="Ej. limpieza, muestra, merma" className={inputCls} />
              </div>
            )}

            <div>
              <label className={labelCls}>Registrado por</label>
              <input value={cForm.consumedBy} onChange={(e) => setCForm({ ...cForm, consumedBy: e.target.value })} required className={inputCls} />
            </div>
            <button type="submit" disabled={cBusy} className="btn-primary w-full justify-center text-sm disabled:opacity-60">
              {cBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MinusCircle className="w-4 h-4" /> Descontar consumo</>}
            </button>
          </form>
        </div>
      </div>

      {/* Historial de ingresos */}
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Historial de ingresos</h3>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Insumo</th>
                  <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-left font-medium">Lote</th>
                  <th className="px-4 py-3 text-left font-medium">Vence</th>
                  <th className="px-4 py-3 text-right font-medium">Temp.</th>
                  <th className="px-4 py-3 text-left font-medium">Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {receipts.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-[#555]">Sin ingresos registrados</td></tr>
                )}
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-border-dark/30 transition-colors">
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-white">{r.materialName}</td>
                    <td className="px-4 py-3 text-[#999]">{r.supplier}</td>
                    <td className="px-4 py-3 text-right text-status-ok font-rajdhani font-semibold">+{r.quantity.toLocaleString()} {r.unit}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#999]">{r.lot ?? '—'}</td>
                    <td className="px-4 py-3 text-[#999]">{r.expiryDate ? formatDate(r.expiryDate) : '—'}</td>
                    <td className="px-4 py-3 text-right text-[#999]">
                      {r.entryTemp != null ? <span className="inline-flex items-center gap-1"><Thermometer className="w-3 h-3" />{r.entryTemp}°</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#999]">{r.receivedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historial de consumos */}
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Historial de consumos</h3>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Insumo</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-left font-medium">Destino</th>
                  <th className="px-4 py-3 text-left font-medium">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {consumptions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#555]">Sin consumos registrados</td></tr>
                )}
                {consumptions.map((c) => (
                  <tr key={c.id} className="hover:bg-border-dark/30 transition-colors">
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-white">{c.materialName}</td>
                    <td className="px-4 py-3 text-right text-pulse-red font-rajdhani font-semibold">−{c.quantity.toLocaleString()} {c.unit}</td>
                    <td className="px-4 py-3 text-[#999]">
                      {c.orderNumber
                        ? <span className="font-mono text-xs">{c.orderNumber}</span>
                        : <span className="text-[#999]">{c.usage}</span>}
                    </td>
                    <td className="px-4 py-3 text-[#999]">{c.consumedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
