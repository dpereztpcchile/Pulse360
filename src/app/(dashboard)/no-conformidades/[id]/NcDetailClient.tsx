'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, AlertTriangle, Paperclip, Loader2, AlertCircle, Check, Pencil,
  FileText, Search as SearchIcon, Wrench, History as HistoryIcon, ChevronRight,
} from 'lucide-react'
import {
  cn, NC_CATEGORY, NC_SEVERITY, NC_STATUS, NC_STATUS_ORDER, ncIsOverdue, formatDate, formatDateTime,
  type NcCategoryKey, type NcSeverityKey, type NcStatusKey,
} from '@/lib/utils'

interface NcHistory {
  id: string
  fromStatus: NcStatusKey | null
  toStatus: NcStatusKey
  changedBy: string
  note: string | null
  createdAt: string
}

interface Nc {
  id: string
  ncNumber: string
  area: string
  category: NcCategoryKey
  severity: NcSeverityKey
  status: NcStatusKey
  title: string
  description: string
  rootCause: string | null
  correctiveAction: string | null
  responsible: string
  dueDate: string
  evidenceUrl: string | null
  evidenceName: string | null
  createdBy: string | null
  createdAt: string
  closedAt: string | null
  history: NcHistory[]
}

export function NcDetailClient({ nc, role }: { nc: Nc; role: string; userName: string }) {
  const router = useRouter()
  const canEdit = role === 'ADMINISTRADOR' || role === 'SUPERVISOR'

  const [rootCause, setRootCause] = useState(nc.rootCause ?? '')
  const [correctiveAction, setCorrectiveAction] = useState(nc.correctiveAction ?? '')
  const [editing, setEditing] = useState(false)
  const [savingFields, setSavingFields] = useState(false)
  const [error, setError] = useState('')

  const [advancing, setAdvancing] = useState<NcStatusKey | null>(null)
  const [note, setNote] = useState('')

  const overdue = ncIsOverdue(nc.dueDate, nc.status)
  const currentIdx = NC_STATUS_ORDER.indexOf(nc.status)

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/nc/${nc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Error al guardar') }
  }

  async function saveFields() {
    setSavingFields(true); setError('')
    try {
      await patch({ rootCause, correctiveAction })
      setEditing(false); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setSavingFields(false) }
  }

  async function advanceTo(status: NcStatusKey) {
    setAdvancing(status); setError('')
    try {
      await patch({ status, note: note.trim() || undefined })
      setNote(''); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setAdvancing(null) }
  }

  const sectionCls = 'card space-y-3'
  const headingCls = 'flex items-center gap-2 text-sm font-semibold text-white uppercase tracking-wide'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Volver */}
      <button onClick={() => router.push('/no-conformidades')}
        className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a No Conformidades
      </button>

      {/* Encabezado */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-[#888]">{nc.ncNumber}</span>
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_CATEGORY[nc.category].cls)}>
                {NC_CATEGORY[nc.category].label}
              </span>
              <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', NC_SEVERITY[nc.severity].cls)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', NC_SEVERITY[nc.severity].dot)} />
                {NC_SEVERITY[nc.severity].label}
              </span>
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', NC_STATUS[nc.status].cls)}>
                {NC_STATUS[nc.status].label}
              </span>
              {overdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-pulse-red/10 text-pulse-red border border-pulse-red/20">
                  <AlertTriangle className="w-3 h-3" /> Vencida
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white">{nc.title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border-dark text-sm">
          <div><p className="text-[#666] text-xs mb-0.5">Área</p><p className="text-white">{nc.area}</p></div>
          <div><p className="text-[#666] text-xs mb-0.5">Responsable</p><p className="text-white">{nc.responsible}</p></div>
          <div><p className="text-[#666] text-xs mb-0.5">Fecha límite</p>
            <p className={overdue ? 'text-pulse-red font-medium' : 'text-white'}>{formatDate(nc.dueDate)}</p></div>
          <div><p className="text-[#666] text-xs mb-0.5">Creada</p><p className="text-white">{formatDate(nc.createdAt)}</p></div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Barra de progreso de estados */}
      <div className="card">
        <h2 className={cn(headingCls, 'mb-4')}><ChevronRight className="w-4 h-4 text-pulse-red" /> Flujo de estados</h2>
        <div className="flex items-center">
          {NC_STATUS_ORDER.map((s, i) => {
            const done = i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                    done ? 'bg-pulse-red border-pulse-red text-white' : 'bg-bg-dark border-border-dark text-[#555]',
                    isCurrent && 'ring-2 ring-pulse-red/30')}>
                    {i < currentIdx ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={cn('text-[10px] text-center whitespace-nowrap', done ? 'text-white' : 'text-[#555]')}>
                    {NC_STATUS[s].label}
                  </span>
                </div>
                {i < NC_STATUS_ORDER.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-2 -mt-5 transition-colors', i < currentIdx ? 'bg-pulse-red' : 'bg-border-dark')} />
                )}
              </div>
            )
          })}
        </div>

        {/* Avance de estado */}
        {canEdit && nc.status !== 'CERRADA' && (
          <div className="mt-5 pt-5 border-t border-border-dark space-y-3">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota del cambio de estado (opcional)"
              className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm focus:outline-none focus:border-pulse-red" />
            <div className="flex gap-2 flex-wrap">
              {NC_STATUS_ORDER.slice(currentIdx + 1).map((s) => (
                <button key={s} onClick={() => advanceTo(s)} disabled={advancing !== null}
                  className={cn('btn-secondary text-sm disabled:opacity-60', s === NC_STATUS_ORDER[currentIdx + 1] && 'btn-primary')}>
                  {advancing === s ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Pasar a {NC_STATUS[s].label}</>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Descripción */}
      <div className={sectionCls}>
        <h2 className={headingCls}><FileText className="w-4 h-4 text-pulse-red" /> Descripción del problema</h2>
        <p className="text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed">{nc.description}</p>
        {nc.evidenceUrl && (
          <a href={nc.evidenceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-pulse-red hover:underline">
            <Paperclip className="w-4 h-4" /> {nc.evidenceName ?? 'Ver evidencia'}
          </a>
        )}
      </div>

      {/* Causa raíz + Acción correctiva */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className={headingCls}><SearchIcon className="w-4 h-4 text-pulse-red" /> Análisis y acciones</h2>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wide flex items-center gap-1.5">
            <SearchIcon className="w-3.5 h-3.5" /> Análisis de causa raíz
          </p>
          {editing ? (
            <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={3}
              placeholder="Ej. Falla en compresor de cámara, Variación en materia prima, Error operacional en pesaje"
              className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm resize-none focus:outline-none focus:border-pulse-red" />
          ) : (
            <p className="text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed">{nc.rootCause || <span className="text-[#555] italic">Sin registrar</span>}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wide flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> Acción correctiva / preventiva
          </p>
          {editing ? (
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={3}
              placeholder="Describe la acción correctiva o preventiva..."
              className="w-full px-4 py-2.5 rounded-lg bg-bg-dark border border-border-dark text-white text-sm resize-none focus:outline-none focus:border-pulse-red" />
          ) : (
            <p className="text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed">{nc.correctiveAction || <span className="text-[#555] italic">Sin registrar</span>}</p>
          )}
        </div>

        {editing && (
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setEditing(false); setRootCause(nc.rootCause ?? ''); setCorrectiveAction(nc.correctiveAction ?? '') }}
              className="btn-secondary text-sm">Cancelar</button>
            <button onClick={saveFields} disabled={savingFields} className="btn-primary text-sm disabled:opacity-60">
              {savingFields ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className={sectionCls}>
        <h2 className={headingCls}><HistoryIcon className="w-4 h-4 text-pulse-red" /> Historial de cambios</h2>
        <ol className="relative border-l border-border-dark ml-1.5 space-y-5 mt-2">
          {nc.history.map((h) => (
            <li key={h.id} className="ml-5">
              <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-pulse-red border-2 border-card-dark" />
              <div className="flex items-center gap-2 flex-wrap text-sm">
                {h.fromStatus ? (
                  <span className="text-[#ccc]">
                    {NC_STATUS[h.fromStatus].label} <span className="text-[#555]">→</span> <span className="font-medium text-white">{NC_STATUS[h.toStatus].label}</span>
                  </span>
                ) : (
                  <span className="font-medium text-white">{NC_STATUS[h.toStatus].label}</span>
                )}
              </div>
              <p className="text-xs text-[#666] mt-0.5">{h.changedBy} · {formatDateTime(h.createdAt)}</p>
              {h.note && <p className="text-sm text-[#999] mt-1">{h.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
