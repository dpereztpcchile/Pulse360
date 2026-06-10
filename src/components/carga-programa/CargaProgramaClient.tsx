'use client'

import { useRef, useState, useCallback, type ComponentType } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { FileUp, FileSpreadsheet, AlertCircle, CheckCircle2, Calendar, Scissors, Boxes, FolderOpen, Loader2, ClipboardList } from 'lucide-react'
import { parseWorkbook, type ParseResult } from '@/lib/carga-programa/parse'

const fmtKg = (n: number) => Math.round(n).toLocaleString('es-CL')
const fmtFecha = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}` }
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { const r = String(reader.result); const i = r.indexOf(','); resolve(i >= 0 ? r.slice(i + 1) : r) }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function CargaProgramaClient({ today, user }: { today: string; user: string }) {
  const [fecha, setFecha] = useState(today)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState<string | null>(null)
  const [dupInfo, setDupInfo] = useState<{ cargadoPor: string; cargadoEn: string } | null>(null)

  void user
  const reset = () => { setFile(null); setParsed(null); setError(null); setSuccess(null); setDupInfo(null) }

  const handleFile = useCallback(async (f: File) => {
    setError(null); setSuccess(null); setParsed(null); setDupInfo(null)
    if (!f.name.toLowerCase().endsWith('.xlsx') && !f.name.toLowerCase().endsWith('.xls')) {
      setError('El archivo debe ser .xlsx'); setFile(null); return
    }
    setFile(f)
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
      const result = parseWorkbook(wb)
      if (!result.ok) { setError(result.error ?? 'Archivo inválido'); setParsed(null); return }
      setParsed(result)
    } catch {
      setError('No se pudo leer el archivo Excel.')
    }
  }, [])

  async function cargar(replace: boolean) {
    if (!parsed || !file) return
    setUploading(true); setProgress(8); setDupInfo(null); setError(null)
    const tick = setInterval(() => setProgress((p) => Math.min(90, p + 9)), 150)
    const archivoData = await fileToBase64(file).catch(() => null)
    const res = await fetch('/api/carga-programa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, archivoNombre: file.name, archivoTamanio: file.size, archivoData, replace, dotacion: parsed.dotacion, carniceria: parsed.carniceria, molienda: parsed.molienda, ordenes: parsed.ordenes }),
    })
    clearInterval(tick)
    if (res.status === 409) {
      const d = await res.json()
      setDupInfo({ cargadoPor: d.info?.cargadoPor ?? '—', cargadoEn: d.info?.cargadoEn ?? '' })
      setProgress(0); setUploading(false); return
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Error al cargar el programa.'); setProgress(0); setUploading(false); return
    }
    const d = await res.json()
    setProgress(100)
    const partes: string[] = []
    if (d.resumen) partes.push(`Programa del ${fmtFecha(d.resumen.fecha)}: Carnicería ${d.resumen.cortesCarniceria} cortes — ${fmtKg(d.resumen.kgMPCarniceria)} kg MP · Molienda ${d.resumen.productosMolienda} productos`)
    if (d.ordenesImportadas > 0 || d.ordenesActualizadas > 0) partes.push(`${d.ordenesImportadas || 0} órdenes importadas, ${d.ordenesActualizadas || 0} actualizadas`)
    setSuccess(partes.join('  ·  ') || 'Carga completada correctamente.')
    setFile(null); setParsed(null)
    setTimeout(() => { setUploading(false); setProgress(0) }, 600)
  }

  return (
    <div className="space-y-6">
      {/* ── Zona de carga ── */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-white">Cargar programa del día</h2>
          <label className="flex items-center gap-2 text-sm text-[#999]">
            <Calendar className="w-4 h-4 text-pulse-red" /> Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="bg-bg-dark border border-border-dark rounded-lg px-3 py-1.5 text-sm text-white focus:border-pulse-red outline-none" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadZone icon={FileUp} label="Programa del día" sublabel="Carnicería / Molienda — .xlsx" onFile={handleFile} />
          <UploadZone icon={ClipboardList} label="Maestro de OF (SAP)" sublabel="Órdenes de Fabricación — .xlsx" onFile={handleFile} />
        </div>

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

        {success && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-status-ok/10 border border-status-ok/30 text-sm text-status-ok">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> <span>{success}</span>
          </div>
        )}

        {uploading && (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-border-dark overflow-hidden">
              <div className="h-full bg-pulse-red transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-[#666] mt-1 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando programa… {progress}%</p>
          </div>
        )}

        {/* Preview */}
        {parsed && parsed.ok && !uploading && (
          <Preview parsed={parsed} onCargar={() => cargar(false)} onCancel={reset} />
        )}
      </div>

      {/* Acceso a la carpeta de archivos cargados */}
      <Link href="/carga-archivos/carpeta" className="btn-secondary inline-flex items-center gap-2 text-sm w-fit">
        <FolderOpen className="w-4 h-4" /> Ver archivos cargados
      </Link>

      {/* Modal duplicado */}
      {dupInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card border border-border-dark shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-status-warn" />
              <h2 className="font-semibold text-white">Programa existente</h2>
            </div>
            <p className="text-sm text-[#999] mb-1">Ya existe un programa cargado para el <b className="text-white">{fmtFecha(fecha)}</b>.</p>
            <p className="text-sm text-[#666] mb-4">Cargado el {dupInfo.cargadoEn ? fmtDateTime(dupInfo.cargadoEn) : '—'} por {dupInfo.cargadoPor}.</p>
            <div className="flex gap-3">
              <button onClick={() => setDupInfo(null)} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
              <button onClick={() => cargar(true)} className="btn-primary flex-1 justify-center text-sm">Reemplazar programa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadZone({ icon: Icon, label, sublabel, onFile }: { icon: ComponentType<{ className?: string }>; label: string; sublabel: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer px-5 py-8 text-center ${over ? 'border-pulse-red bg-pulse-red/5' : 'border-border-dark hover:border-pulse-red/50'}`}
    >
      <Icon className="w-9 h-9 text-pulse-red mx-auto mb-2" />
      <p className="text-white font-medium">{label}</p>
      <p className="text-xs text-[#666] mt-1">{sublabel}</p>
      <button type="button" onClick={(e) => { e.stopPropagation(); ref.current?.click() }} className="btn-secondary text-sm mt-3">Seleccionar archivo</button>
      <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

function Preview({ parsed, onCargar, onCancel }: { parsed: ParseResult; onCargar: () => void; onCancel: () => void }) {
  const totMP = parsed.carniceria.reduce((a, c) => a + c.kgMPTeorico, 0)
  const totPT = parsed.carniceria.reduce((a, c) => a + c.kgPTPlan, 0)
  const totBatches = parsed.molienda.reduce((a, m) => a + m.numBatches, 0)
  const totMoler = parsed.molienda.reduce((a, m) => a + m.kgTotal, 0)
  const totOFPlan = parsed.ordenes.reduce((a, o) => a + o.cantidadPlanificada, 0)
  const hasCarn = parsed.carniceria.length > 0
  const hasMol = parsed.molienda.length > 0
  const hasOF = parsed.ordenes.length > 0
  return (
    <div className="mt-5 border-t border-border-dark pt-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasCarn && (
          <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
            <div className="flex items-center gap-2 mb-3"><Scissors className="w-4 h-4 text-pulse-red" /><h3 className="font-semibold text-white">Carnicería</h3></div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div><p className="text-lg font-bold text-white">{parsed.carniceria.length}</p><p className="text-[10px] text-[#666]">cortes</p></div>
              <div><p className="text-lg font-bold text-white">{fmtKg(totMP)}</p><p className="text-[10px] text-[#666]">kg MP</p></div>
              <div><p className="text-lg font-bold text-white">{fmtKg(totPT)}</p><p className="text-[10px] text-[#666]">kg PT</p></div>
            </div>
            <ul className="text-xs text-[#999] space-y-1">
              {parsed.carniceria.slice(0, 5).map((c, i) => (
                <li key={i} className="flex justify-between"><span className="truncate pr-2">{c.nombre}</span><span className="text-[#ccc] shrink-0">{fmtKg(c.kgMPTeorico)} kg MP</span></li>
              ))}
              {parsed.carniceria.length > 5 && <li className="text-[#555]">+ {parsed.carniceria.length - 5} más…</li>}
            </ul>
          </div>
        )}

        {hasMol && (
          <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
            <div className="flex items-center gap-2 mb-3"><Boxes className="w-4 h-4 text-pulse-red" /><h3 className="font-semibold text-white">Molienda — MOLIDA</h3></div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div><p className="text-lg font-bold text-white">{parsed.molienda.length}</p><p className="text-[10px] text-[#666]">productos</p></div>
              <div><p className="text-lg font-bold text-white">{fmtKg(totMoler)}</p><p className="text-[10px] text-[#666]">kg a moler</p></div>
              <div><p className="text-lg font-bold text-white">{totBatches}</p><p className="text-[10px] text-[#666]">batches</p></div>
            </div>
            <ul className="text-xs text-[#999] space-y-1">
              {parsed.molienda.slice(0, 5).map((m, i) => (
                <li key={i} className="flex justify-between"><span className="truncate pr-2">{m.productoNombre}</span><span className="text-[#ccc] shrink-0">{m.numBatches} batches</span></li>
              ))}
              {parsed.molienda.length > 5 && <li className="text-[#555]">+ {parsed.molienda.length - 5} más…</li>}
            </ul>
          </div>
        )}

        {hasOF && (
          <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
            <div className="flex items-center gap-2 mb-3"><ClipboardList className="w-4 h-4 text-pulse-red" /><h3 className="font-semibold text-white">Órdenes de Fabricación (SAP)</h3></div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-center">
              <div><p className="text-lg font-bold text-white">{parsed.ordenes.length}</p><p className="text-[10px] text-[#666]">OF</p></div>
              <div><p className="text-lg font-bold text-white">{fmtKg(totOFPlan)}</p><p className="text-[10px] text-[#666]">cant. planificada</p></div>
            </div>
            <ul className="text-xs text-[#999] space-y-1">
              {parsed.ordenes.slice(0, 5).map((o, i) => (
                <li key={i} className="flex justify-between gap-2"><span className="truncate"><b className="text-[#bbb]">{o.numeroOF}</b> · {o.producto}</span><span className="text-[#ccc] shrink-0">{fmtKg(o.cantidadPlanificada)}</span></li>
              ))}
              {parsed.ordenes.length > 5 && <li className="text-[#555]">+ {parsed.ordenes.length - 5} más…</li>}
            </ul>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
        <button onClick={onCargar} className="btn-primary text-sm flex-1 justify-center">CARGAR</button>
      </div>
    </div>
  )
}
