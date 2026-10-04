'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileUp, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2,
  PlusCircle, MinusCircle, Copy, ListChecks,
} from 'lucide-react'

interface PreviewResult {
  totalRowsInSheet: number
  totalFilasValidas: number
  nuevas: number
  existentes: number
  duplicatesInFile: number
  issues: { rowNumber: number; ncNumber: number | null; message: string }[]
}

interface ImportResult {
  inserted: number
  skippedExisting: number
  duplicatesInFile: number
  issues: { rowNumber: number; ncNumber: number | null; message: string }[]
  totalRowsInSheet: number
  message: string
}

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export function NcCargaClient() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showIssues, setShowIssues] = useState(false)

  const reset = () => { setFile(null); setPreview(null); setError(null); setResult(null); setShowIssues(false) }

  const handleFile = useCallback(async (f: File) => {
    setError(null); setResult(null); setPreview(null); setShowIssues(false)
    if (!f.name.toLowerCase().endsWith('.xlsx') && !f.name.toLowerCase().endsWith('.xls')) {
      setError('El archivo debe ser un Excel (.xlsx o .xls).')
      return
    }
    setFile(f)
    setLoadingPreview(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/nc/import', { method: 'PUT', body: fd })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'No se pudo procesar el archivo.')
        setFile(null)
        return
      }
      setPreview(d)
    } catch {
      setError('No se pudo leer el archivo Excel.')
      setFile(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  async function confirmar() {
    if (!file) return
    setConfirming(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/nc/import', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'No se pudo importar el archivo.')
        return
      }
      setResult(d)
      setPreview(null)
      setFile(null)
      router.refresh()
    } catch {
      setError('Error de red al importar el archivo.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-white">Cargar NC desde Excel</h2>
            <p className="text-xs text-[#666] mt-0.5">Archivo &quot;SEGUIMIENTO NC.xlsx&quot; — hoja &quot;CUADRO DE SEGUIMIENTO NC&quot;</p>
          </div>
        </div>

        <UploadZone onFile={handleFile} />

        {file && (
          <div className="flex items-center gap-2 mt-3 text-sm text-[#ccc]">
            <FileSpreadsheet className="w-4 h-4 text-status-ok" />
            <span className="font-medium">{file.name}</span>
            <span className="text-[#666]">· {fmtSize(file.size)}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-pulse-red/10 border border-pulse-red/20 text-sm text-pulse-red">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loadingPreview && (
          <div className="flex items-center gap-2 mt-4 text-sm text-[#999]">
            <Loader2 className="w-4 h-4 animate-spin" /> Analizando archivo…
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-status-ok/10 border border-status-ok/30 text-sm text-status-ok">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> <span>{result.message}</span>
          </div>
        )}

        {preview && !loadingPreview && (
          <Preview preview={preview} onConfirm={confirmar} onCancel={reset} confirming={confirming}
            showIssues={showIssues} setShowIssues={setShowIssues} />
        )}

        {result && result.issues.length > 0 && (
          <IssuesList issues={result.issues} show={showIssues} setShow={setShowIssues} />
        )}
      </div>

      <div className="card bg-bg-dark/40">
        <p className="text-xs text-[#666] leading-relaxed">
          <b className="text-[#999]">Cómo funciona la carga:</b> el archivo subido debe contener el histórico
          completo más las NC nuevas de la semana. Las NC cuyo <b className="text-[#999]">N° de NC</b> ya
          exista en la base de datos <b className="text-[#999]">nunca se actualizan</b>: solo se insertan las
          filas con un N° de NC nuevo. Esto garantiza que los datos históricos no cambien.
        </p>
      </div>
    </div>
  )
}

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer px-5 py-10 text-center ${over ? 'border-pulse-red bg-pulse-red/5' : 'border-border-dark hover:border-pulse-red/50'}`}
    >
      <FileUp className="w-9 h-9 text-pulse-red mx-auto mb-2" />
      <p className="text-white font-medium">Arrastra aquí el Excel de NC</p>
      <p className="text-xs text-[#666] mt-1">SEGUIMIENTO NC.xlsx — .xlsx / .xls</p>
      <button type="button" onClick={(e) => { e.stopPropagation(); ref.current?.click() }} className="btn-secondary text-sm mt-3">Seleccionar archivo</button>
      <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

function Preview({ preview, onConfirm, onCancel, confirming, showIssues, setShowIssues }: {
  preview: PreviewResult
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
  showIssues: boolean
  setShowIssues: (v: boolean) => void
}) {
  return (
    <div className="mt-5 border-t border-border-dark pt-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat icon={ListChecks} label="Filas válidas" value={preview.totalFilasValidas} />
        <Stat icon={PlusCircle} label="NC nuevas" value={preview.nuevas} accent="ok" />
        <Stat icon={MinusCircle} label="Ya existentes" value={preview.existentes} accent="neutral" />
        <Stat icon={Copy} label="Duplicadas en archivo" value={preview.duplicatesInFile} accent={preview.duplicatesInFile > 0 ? 'warn' : 'neutral'} />
      </div>

      {preview.issues.length > 0 && (
        <IssuesList issues={preview.issues} show={showIssues} setShow={setShowIssues} />
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="btn-secondary text-sm" disabled={confirming}>Cancelar</button>
        <button onClick={onConfirm} className="btn-primary text-sm flex-1 justify-center disabled:opacity-50" disabled={confirming || preview.nuevas === 0}>
          {confirming ? <span className="flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Importando…</span>
            : preview.nuevas === 0 ? 'No hay NC nuevas para importar' : `Confirmar importación de ${preview.nuevas} NC nuevas`}
        </button>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent = 'neutral' }: {
  icon: typeof ListChecks
  label: string
  value: number
  accent?: 'ok' | 'warn' | 'neutral'
}) {
  const color = accent === 'ok' ? 'text-status-ok' : accent === 'warn' ? 'text-status-warn' : 'text-[#999]'
  return (
    <div className="bg-bg-dark rounded-lg p-3 border border-border-dark text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold text-white">{value.toLocaleString('es-CL')}</p>
      <p className="text-[10px] text-[#666]">{label}</p>
    </div>
  )
}

function IssuesList({ issues, show, setShow }: {
  issues: { rowNumber: number; ncNumber: number | null; message: string }[]
  show: boolean
  setShow: (v: boolean) => void
}) {
  return (
    <div className="mt-3">
      <button onClick={() => setShow(!show)} className="text-xs text-[#999] hover:text-white transition-colors underline underline-offset-2">
        {show ? 'Ocultar' : 'Ver'} {issues.length} fila{issues.length === 1 ? '' : 's'} omitida{issues.length === 1 ? '' : 's'} del archivo
      </button>
      {show && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border-dark bg-bg-dark">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-dark text-[#666] uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-medium">Fila</th>
                <th className="px-3 py-2 text-left font-medium">N° NC</th>
                <th className="px-3 py-2 text-left font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {issues.map((iss, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 text-[#999]">{iss.rowNumber}</td>
                  <td className="px-3 py-1.5 text-[#999]">{iss.ncNumber ?? '—'}</td>
                  <td className="px-3 py-1.5 text-[#999]">{iss.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
