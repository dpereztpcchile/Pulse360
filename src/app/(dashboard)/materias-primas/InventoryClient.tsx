'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Package, CalendarClock, AlertTriangle, Boxes, Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import {
  cn, MATERIAL_CATEGORY, MATERIAL_STATE, formatDate, daysUntil,
  type MaterialCategoryKey, type MaterialStateKey,
} from '@/lib/utils'

interface Material {
  id: string
  name: string
  code: string
  category: MaterialCategoryKey
  unit: string
  currentStock: number
  minStock: number
  dailyUsageKg: number
  nearestExpiry: string | null
  state: MaterialStateKey
}

const CATEGORIES = ['REFRIGERADO', 'CONGELADO', 'IMPORTADO', 'EN_TRANSITO'] as const

const emptyForm = { name: '', code: '', category: 'REFRIGERADO', unit: 'kg', minStock: '', dailyUsageKg: '' }

export function InventoryClient({
  initialMaterials, kpis, role,
}: {
  initialMaterials: Material[]
  kpis: { stockTotal: number; avgCoverage: number; ingresosHoy: number; enAlerta: number }
  role: string
}) {
  const router = useRouter()
  const canManage = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const [tab, setTab] = useState<'TODOS' | MaterialCategoryKey>('TODOS')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const belowMin = initialMaterials.filter((m) => m.state === 'BAJO_MINIMO')

  const filtered = useMemo(
    () => (tab === 'TODOS' ? initialMaterials : initialMaterials.filter((m) => m.category === tab)),
    [initialMaterials, tab]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, code: form.code, category: form.category, unit: form.unit,
          minStock: Number(form.minStock), dailyUsageKg: Number(form.dailyUsageKg),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar'); setBusy(false); return
      }
      setModalOpen(false); setForm({ ...emptyForm }); router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Banner rojo: insumos bajo mínimo */}
      {belowMin.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-pulse-red/10 border border-pulse-red/30">
          <AlertTriangle className="w-5 h-5 text-pulse-red shrink-0 animate-pulse" />
          <p className="text-sm text-pulse-red font-medium">
            {belowMin.length} {belowMin.length === 1 ? 'insumo está' : 'insumos están'} bajo el stock mínimo:{' '}
            <span className="font-semibold">{belowMin.map((m) => m.name).join(', ')}</span>
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Stock Total" value={kpis.stockTotal.toLocaleString()} unit="kg" icon={Boxes} status="neutral" />
        <KPICard title="Días Cobertura" value={kpis.avgCoverage || '—'} unit={kpis.avgCoverage ? 'días' : ''} icon={CalendarClock} status="ok" />
        <KPICard title="Ingresos del Día" value={kpis.ingresosHoy.toLocaleString()} unit="kg" icon={Package} status="ok" />
        <KPICard title="Insumos en Alerta" value={kpis.enAlerta} unit="" icon={AlertTriangle} status={kpis.enAlerta > 0 ? 'stop' : 'ok'} />
      </div>

      {/* Tabs de categoría + acción */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setTab('TODOS')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'TODOS' ? 'bg-pulse-red text-white' : 'bg-card-dark text-[#999] hover:text-white border border-border-dark')}
        >
          Todos
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === c ? 'bg-pulse-red text-white' : 'bg-card-dark text-[#999] hover:text-white border border-border-dark')}
          >
            {MATERIAL_CATEGORY[c].label}
          </button>
        ))}
        {canManage && (
          <button onClick={() => { setForm({ ...emptyForm }); setError(''); setModalOpen(true) }} className="btn-primary text-sm ml-auto">
            <Plus className="w-4 h-4" /> Nuevo insumo
          </button>
        )}
      </div>

      {/* Tabla de inventario */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Insumo</th>
                <th className="px-4 py-3 text-left font-medium">Código</th>
                <th className="px-4 py-3 text-left font-medium">Categoría</th>
                <th className="px-4 py-3 text-right font-medium">Stock actual</th>
                <th className="px-4 py-3 text-right font-medium">Stock mínimo</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Vencimiento próximo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#555]">Sin insumos en esta categoría</td></tr>
              )}
              {filtered.map((m) => {
                const st = MATERIAL_STATE[m.state]
                const days = daysUntil(m.nearestExpiry)
                return (
                  <tr key={m.id} className="hover:bg-border-dark/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#999]">{m.code}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', MATERIAL_CATEGORY[m.category].cls)}>
                        {MATERIAL_CATEGORY[m.category].label}
                      </span>
                    </td>
                    <td className={cn('px-4 py-3 text-right font-rajdhani font-bold text-base',
                      m.state === 'BAJO_MINIMO' ? 'text-pulse-red' : 'text-white')}>
                      {m.currentStock.toLocaleString()} <span className="text-xs font-normal text-[#666]">{m.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#999]">{m.minStock.toLocaleString()} {m.unit}</td>
                    <td className="px-4 py-3">
                      <span className={cn(st.badge, st.blink && 'animate-pulse')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999]">
                      {m.nearestExpiry ? (
                        <span className={cn(days !== null && days <= 14 && 'text-status-warn font-medium')}>
                          {formatDate(m.nearestExpiry)}
                          {days !== null && (
                            <span className="text-xs text-[#666] ml-1">
                              ({days < 0 ? 'vencido' : `${days}d`})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[#555]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo insumo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg card border border-border-dark shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Nuevo insumo</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Nombre</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Código</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{MATERIAL_CATEGORY[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Unidad</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#ccc] mb-1.5">Stock mínimo</label>
                  <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} required
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ccc] mb-1.5">Consumo diario estimado (para días de cobertura)</label>
                <input type="number" min="0" value={form.dailyUsageKg} onChange={(e) => setForm({ ...form, dailyUsageKg: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
