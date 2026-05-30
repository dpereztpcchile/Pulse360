'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { SHEET_BISTEC, SHEET_MOLIDA, pesoUnitarioFromFormato } from '@/lib/control-turno/config'

type Row = Record<string, unknown>

const DIACRITICS = /[̀-ͯ]/g
function norm(s: string) {
  return s.toString().toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim()
}
function pick(row: Row, candidates: string[]): unknown {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const k = keys.find((kk) => norm(kk).includes(norm(c)))
    if (k != null) return row[k]
  }
  return undefined
}
const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

interface ParsedLine { code: string; registros: Row[] }

function parseWorkbook(wb: XLSX.WorkBook): ParsedLine[] {
  const lineas: ParsedLine[] = []

  // Hoja BISTEC-TROZOS → Carnicería
  const wsBistec = wb.Sheets[SHEET_BISTEC]
  if (wsBistec) {
    const rows = XLSX.utils.sheet_to_json<Row>(wsBistec)
    const registros = rows
      .map((r) => ({
        sku: pick(r, ['sku']) != null ? String(pick(r, ['sku'])) : null,
        productoNombre: String(pick(r, ['producto']) ?? '').trim(),
        kgPlan: num(pick(r, ['pedido (kg)', 'pedido', 'kg'])),
        rendTeoricoPorc: num(pick(r, ['% rend', 'rend', 'rendimiento'])) || null,
      }))
      .filter((r) => r.productoNombre)
    if (registros.length) lineas.push({ code: 'CARNICERIA', registros })
  }

  // Hoja MOLIDA → Molienda (con batches)
  const wsMolida = wb.Sheets[SHEET_MOLIDA]
  if (wsMolida) {
    const rows = XLSX.utils.sheet_to_json<Row>(wsMolida)
    const registros = rows
      .map((r) => {
        const productoNombre = String(pick(r, ['producto']) ?? '').trim()
        return {
          productoNombre,
          numBatches: num(pick(r, ['n batches', 'n° batches', 'batches', 'nro batches'])),
          kgBatch: num(pick(r, ['kg/batch', 'kg batch', 'kg por batch', 'kg/lote'])),
          pesoUnitarioKg: pesoUnitarioFromFormato(productoNombre),
        }
      })
      .filter((r) => r.productoNombre)
    if (registros.length) lineas.push({ code: 'MOLIENDA', registros })
  }

  return lineas
}

export function ProgramUpload({ fecha, turno, user, canManage }: { fecha: string; turno: string; user: string; canManage: boolean }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const pending = useRef<{ archivoNombre: string; lineas: ParsedLine[] } | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)

  if (!canManage) return null

  async function handleFile(file: File) {
    setBusy(true); setMsg(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const lineas = parseWorkbook(wb)
      if (lineas.length === 0) {
        setMsg({ type: 'error', text: `No se encontraron las hojas "${SHEET_BISTEC}" o "${SHEET_MOLIDA}" con datos válidos.` })
        setBusy(false)
        return
      }
      pending.current = { archivoNombre: file.name, lineas }
      await send(false)
    } catch {
      setMsg({ type: 'error', text: 'No se pudo leer el archivo Excel.' })
      setBusy(false)
    }
  }

  async function send(replace: boolean) {
    if (!pending.current) return
    setBusy(true)
    const res = await fetch('/api/control-turno/programa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, turno, creadoPor: user, archivoNombre: pending.current.archivoNombre, lineas: pending.current.lineas, replace }),
    })
    if (res.status === 409) {
      setConfirmReplace(true)
      setBusy(false)
      return
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMsg({ type: 'error', text: d.error || 'Error al cargar el programa.' })
      setBusy(false)
      return
    }
    const d = await res.json()
    setConfirmReplace(false)
    pending.current = null
    setMsg({ type: 'ok', text: `Programa cargado: ${d.lineas} línea(s), ${d.registros} producto(s).` })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Cargar programa del día
      </button>

      {msg && (
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${msg.type === 'ok' ? 'bg-status-ok/10 border-status-ok/30 text-status-ok' : 'bg-pulse-red/10 border-pulse-red/20 text-pulse-red'}`}>
          {msg.type === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />} {msg.text}
        </div>
      )}

      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm card border border-border-dark shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-status-warn" />
              <h2 className="font-semibold text-white">Programa existente</h2>
            </div>
            <p className="text-sm text-[#999] mb-4">Ya existe un programa cargado para este día y turno. ¿Deseas reemplazarlo? Se perderán los registros actuales.</p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmReplace(false); pending.current = null }} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
              <button onClick={() => send(true)} disabled={busy} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reemplazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
