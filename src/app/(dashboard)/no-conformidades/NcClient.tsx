'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, AlertCircle, AlertTriangle, ShieldAlert, CalendarX, CheckCircle2, Search, Paperclip, Upload } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import {
  cn, NC_CATEGORY, NC_SEVERITY, NC_STATUS, NC_STATUS_ORDER, ncIsOverdue, formatDate,
  type NcCategoryKey, type NcSeverityKey, type NcStatusKey,
} from '@/lib/utils'

interface Nc {
  id: string
  ncNumber: string
  area: string
  category: NcCategoryKey
  severity: NcSeverityKey
  status: NcStatusKey
  title: string
  responsible: string
  dueDate: string
  createdAt: string
}

const CATEGORIES: NcCategoryKey[] = ['CALIDAD', 'INOCUIDAD', 'PROCESO', 'PROVEEDOR']
const SEVERITIES: NcSeverityKey[] = ['CRITICA', 'MAYOR', 'MENOR']

const emptyForm = {
  area: '', category: 'CALIDAD', severity: 'MAYOR', title: '', description: '',
  responsible: '', dueDate: '', evidenceUrl: '', evidenceName: '',
}

export function NcClient({
  initialNcs, kpis, role, userName,
}: {
  initialNcs: Nc[]
  kpis: { abiertas: number; criticas: number; vencidas: number; cerradasMes: number }
  role: string
  userName: string
}) {
  const router = useRouter()

  const [fStatus, setFStatus] = useState<'TODOS' | NcStatusKey>('TODOS')
  const [fSeverity, setFSeverity] = useState<'TODOS' | NcSeverityKey>('TODOS')
  const [fCategory, setFCategory] = useState<'TODOS' | NcCategoryKey>('TODOS')
  const [fArea, setFArea] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm, responsible: userName })
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    return initialNcs.filter((n) => {
      if (fStatus !== 'TODOS' && n.status !== fStatus) return false
      if (fSeverity !== 'TODOS' && n.severity !== fSeverity) return false
      if (fCategory !== 'TODOS' && n.category !== fCategory) return false
      if (fArea && !n.area.toLowerCase().includes(fArea.toLowerCase())) return false
      return true
    })
  }, [initialNcs, fStatus, fSeverity, fCategory, fArea])

  function openCreate() {
    setForm({ ...emptyForm, responsible: userName, dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10) })
    setError(''); setModalOpen(true)
  }

  async function handleUpload(file: File) {
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/nc/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al subir archivo'); return }
      setForm((f) => ({ ...f, evidenceUrl: data.url, evidenceName: data.name }))
    } catch { setError('Error al subir archivo') } finally { setUploading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/nc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar'); setBusy(false); return }
      setModalOpen(false); router.refresh()
    } catch { setError('Error de conexión') } finally { setBusy(false) }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red'
  const labelCls = 'block text-sm font-medium text-[#ccc] mb-1.5'

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total Abiertas" value={kpis.abiertas} unit="" icon={AlertTriangle} status={kpis.abiertas > 0 ? 'warn' : 'ok'} />
        <KPICard title="Críticas Activas" value={kpis.criticas} unit="" icon={ShieldAlert} status={kpis.criticas > 0 ? 'stop' : 'ok'} />
        <KPICard title="Vencidas" value={kpis.vencidas} unit="" icon={CalendarX} status={kpis.vencidas > 0 ? 'stop' : 'ok'} />
        <KPICard title="Cerradas este Mes" value={kpis.cerradasMes} unit="" icon={CheckCircle2} status="ok" />
      </div>

      {/* Filtros + acción */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
          <input value={fArea} onChange={(e) => setFArea(e.target.value)} placeholder="Buscar área"
            className="pl-9 pr-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
        </div>
        <select value={fCategory} onChange={(e) => setFCategory(e.target.value as 'TODOS' | NcCategoryKey)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{NC_CATEGORY[c].label}</option>)}
        </select>
        <select value={fSeverity} onChange={(e) => setFSeverity(e.target.value as 'TODOS' | NcSeverityKey)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Toda gravedad</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{NC_SEVERITY[s].label}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as 'TODOS' | NcStatusKey)}
          className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red">
          <option value="TODOS">Todos los estados</option>
          {NC_STATUS_ORDER.map((s) => <option key={s} value={s}>{NC_STATUS[s].label}</option>)}
        </select>
        {(fArea || fCategory !== 'TODOS' || fSeverity !== 'TODOS' || fStatus !== 'TODOS') && (
          <button onClick={() => { setFArea(''); setFCategory('TODOS'); setFSeverity('TODOS'); setFStatus('TODOS') }}
            className="text-xs text-[#666] hover:text-white transition-colors">Limpiar filtros</button>
        )}
        <button onClick={openCreate} className="btn-primary text-sm ml-auto">
          <Plus className="w-4 h-4" /> Nueva NC
        </button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark text-[#666] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">N° NC</th>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Área</th>
                <th className="px-4 py-3 text-left font-medium">Descripción</th>
                <th className="px-4 py-3 text-left font-medium">Categoría</th>
                <th className="px-4 py-3 text-left font-medium">Gravedad</th>
                <th className="px-4 py-3 text-left font-medium">Responsable</th>
                <th className="px-4 py-3 text-left font-medium">Fecha límite</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[#555]">Sin no conformidades que coincidan</td></tr>
              )}
              {filtered.map((n) => {
                const overdue = ncIsOverdue(n.dueDate, n.status)
                return (
                  <tr key={n.id}
                    onClick={() => router.push(`/no-conformidades/${n.id}`)}
                    className={cn('cursor-pointer transition-colors',
                      overdue ? 'bg-pulse-red/5 hover:bg-pulse-red/10' : 'hover:bg-border-dark/30')}>
                    <td className="px-4 py-3 font-mono text-xs text-[#999] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {overdue && <AlertTriangle className="w-3.5 h-3.5 text-pulse-red shrink-0" />}
                        {n.ncNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDate(n.createdAt)}</td>
                    <td className="px-4 py-3 text-[#999]">{n.area}</td>
                    <td className="px-4 py-3 font-medium text-white max-w-xs truncate">{n.title}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_CATEGORY[n.category].cls)}>
                        {NC_CATEGORY[n.category].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', NC_SEVERITY[n.severity].cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', NC_SEVERITY[n.severity].dot)} />
                        {NC_SEVERITY[n.severity].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999]">{n.responsible}</td>
                    <td className={cn('px-4 py-3 whitespace-nowrap', overdue ? 'text-pulse-red font-medium' : 'text-[#999]')}>{formatDate(n.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_STATUS[n.status].cls)}>
                        {NC_STATUS[n.status].label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva NC */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg card border border-border-dark shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Nueva no conformidad</h2>
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
                  <label className={labelCls}>Área afectada</label>
                  <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{NC_CATEGORY[c].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Gravedad</label>
                <div className="flex gap-2">
                  {SEVERITIES.map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, severity: s })}
                      className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                        form.severity === s ? NC_SEVERITY[s].cls : 'bg-bg-dark text-[#999] border-border-dark hover:text-white')}>
                      {NC_SEVERITY[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Descripción breve (título)</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Descripción detallada</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required
                  className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Responsable</label>
                  <input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha límite</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Evidencia (foto o PDF, máx 5 MB)</label>
                {form.evidenceUrl ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-dark border border-border-dark text-sm">
                    <Paperclip className="w-4 h-4 text-status-ok shrink-0" />
                    <span className="text-[#ccc] truncate flex-1">{form.evidenceName}</span>
                    <button type="button" onClick={() => setForm({ ...form, evidenceUrl: '', evidenceName: '' })}
                      className="text-[#666] hover:text-pulse-red transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className={cn('flex items-center justify-center gap-2 p-3 rounded-lg bg-bg-dark border border-dashed border-border-dark text-sm text-[#999] cursor-pointer hover:border-pulse-red transition-colors', uploading && 'opacity-60')}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
                    <input type="file" accept="image/*,application/pdf" disabled={uploading} className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
                <button type="submit" disabled={busy || uploading} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar NC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
