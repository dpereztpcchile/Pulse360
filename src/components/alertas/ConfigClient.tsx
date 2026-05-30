'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle2, AlertCircle, SlidersHorizontal, ToggleRight, Factory } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertConfigShape {
  oeeMinDefault: number
  expiryWarningDays: number
  dispatchDelayHours: number
  capacityOverPct: number
  enableLineStopped: boolean
  enableOeeLow: boolean
  enableShiftNoRecord: boolean
  enableStockLow: boolean
  enableExpiry: boolean
  enableTempRange: boolean
  enableDispatchDelay: boolean
  enableDispatchNoTransporter: boolean
  enableNcCritical: boolean
  enableNcOverdue: boolean
  enableCapacityOver: boolean
}

interface LineRow { id: string; name: string; code: string; oeeMin: number }

const TOGGLES: { key: keyof AlertConfigShape; label: string; module: string }[] = [
  { key: 'enableLineStopped', label: 'Línea detenida', module: 'Producción' },
  { key: 'enableOeeLow', label: 'OEE bajo el umbral', module: 'Producción' },
  { key: 'enableShiftNoRecord', label: 'Turno sin registro', module: 'Producción' },
  { key: 'enableStockLow', label: 'Insumo bajo stock mínimo', module: 'Materias Primas' },
  { key: 'enableExpiry', label: 'Vencimiento próximo', module: 'Materias Primas' },
  { key: 'enableTempRange', label: 'Temperatura fuera de rango', module: 'Materias Primas' },
  { key: 'enableDispatchDelay', label: 'Guía con retraso', module: 'Despacho' },
  { key: 'enableDispatchNoTransporter', label: 'Despacho sin transportista', module: 'Despacho' },
  { key: 'enableNcCritical', label: 'NC crítica abierta', module: 'No Conformidades' },
  { key: 'enableNcOverdue', label: 'NC vencida sin cerrar', module: 'No Conformidades' },
  { key: 'enableCapacityOver', label: 'Línea con ocupación alta', module: 'Capacidad' },
]

export function ConfigClient({ initialConfig, initialLines }: { initialConfig: AlertConfigShape; initialLines: LineRow[] }) {
  const [config, setConfig] = useState<AlertConfigShape>(initialConfig)
  const [lines, setLines] = useState<LineRow[]>(initialLines)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function setNum(key: keyof AlertConfigShape, value: string) {
    const n = value === '' ? 0 : Number(value)
    if (Number.isNaN(n)) return
    setConfig((c) => ({ ...c, [key]: n }))
    setSaved(false)
  }
  function toggle(key: keyof AlertConfigShape) {
    setConfig((c) => ({ ...c, [key]: !c[key] }))
    setSaved(false)
  }
  function setLineOee(id: string, value: string) {
    const n = value === '' ? 0 : Number(value)
    if (Number.isNaN(n)) return
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, oeeMin: n } : l)))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, lines: lines.map((l) => ({ id: l.id, oeeMin: l.oeeMin })) }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al guardar'); return }
      setSaved(true)
    } catch { setError('Error de conexión') } finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red'
  const labelCls = 'block text-xs font-medium text-[#888] mb-1'

  // Agrupa toggles por módulo
  const grouped = TOGGLES.reduce<Record<string, typeof TOGGLES>>((acc, t) => {
    (acc[t.module] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Umbrales globales */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-pulse-red" />
          <h2 className="font-semibold text-white">Umbrales globales</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>OEE mínimo por defecto (%)</label>
            <input type="number" min={0} max={100} value={config.oeeMinDefault || ''} onChange={(e) => setNum('oeeMinDefault', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Anticipación vencimiento (días)</label>
            <input type="number" min={0} value={config.expiryWarningDays || ''} onChange={(e) => setNum('expiryWarningDays', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tolerancia retraso despacho (horas)</label>
            <input type="number" min={0} step={0.5} value={config.dispatchDelayHours || ''} onChange={(e) => setNum('dispatchDelayHours', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ocupación que dispara alerta (%)</label>
            <input type="number" min={0} max={100} value={config.capacityOverPct || ''} onChange={(e) => setNum('capacityOverPct', e.target.value)} className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-[#555]">
          El stock mínimo por insumo se administra en el módulo de <span className="text-[#888]">Materias Primas</span>.
        </p>
      </div>

      {/* OEE mínimo por línea */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-pulse-red" />
          <h2 className="font-semibold text-white">OEE mínimo por línea</h2>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-[#555]">No hay líneas de producción registradas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-bg-dark border border-border-dark px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{l.name}</p>
                  <p className="text-xs text-[#666] font-mono">{l.code}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" min={0} max={100} value={l.oeeMin || ''} onChange={(e) => setLineOee(l.id, e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm text-center focus:outline-none focus:border-pulse-red" />
                  <span className="text-xs text-[#666]">%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activar / desactivar tipos de alerta */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <ToggleRight className="w-4 h-4 text-pulse-red" />
          <h2 className="font-semibold text-white">Tipos de alerta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {Object.entries(grouped).map(([module, items]) => (
            <div key={module} className="py-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#666] mt-2 mb-1">{module}</p>
              {items.map((t) => (
                <label key={t.key} className="flex items-center justify-between py-2 border-b border-border-dark/50 cursor-pointer group">
                  <span className="text-sm text-[#bbb] group-hover:text-white">{t.label}</span>
                  <button
                    type="button"
                    onClick={() => toggle(t.key)}
                    className={cn(
                      'relative w-10 h-5 rounded-full transition-colors shrink-0',
                      config[t.key] ? 'bg-pulse-red' : 'bg-border-dark',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      config[t.key] ? 'translate-x-5' : 'translate-x-0.5',
                    )} />
                  </button>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-status-ok">
            <CheckCircle2 className="w-4 h-4" /> Configuración guardada
          </span>
        )}
        <button onClick={save} disabled={saving} className="btn-primary text-sm ml-auto disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar configuración
        </button>
      </div>
    </div>
  )
}
