'use client'
import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEtiquetado } from '@/lib/hooks/useEtiquetado'
import { CHECKLIST_ITEMS, ChecklistKey, ResultadoItem } from '@/types/etiquetado'

type Paso = 1 | 2 | 3 | 4 | 5
const LINEAS = ['Línea 4', 'Línea 5', 'Skin Pack', 'Milanesas', 'Molienda', 'Línea Molida 1', 'Línea Molida 2']

export default function MaquinistaTablet() {
  const { data: session } = useSession()
  const router = useRouter()
  const { registro, loading, error, analizando, confianzaIA, crearRegistro, subirFoto, analizarConIA, actualizarItem, guardarChecklist, firmar } = useEtiquetado()

  const [paso, setPaso] = useState<Paso>(1)
  const [datos, setDatos] = useState({ lineaProceso: 'Línea 5', producto: '', lote: '', fechaElaboracion: '', fechaVencimiento: '', fechaFaena: '', frigorifico: '', origen: '', precio: '' })
  const [fotoEtiqueta, setFotoEtiqueta] = useState<string | null>(null)
  const [fotoMMPP, setFotoMMPP] = useState<string | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [enviado, setEnviado] = useState(false)
  const inputEtiquetaRef = useRef<HTMLInputElement>(null)
  const inputMMPPRef = useRef<HTMLInputElement>(null)

  const handleContinuarDatos = async () => {
    if (!datos.producto || !datos.lote || !datos.fechaElaboracion || !datos.fechaVencimiento) { alert('Completa los campos obligatorios'); return }
    await crearRegistro({ lineaProceso: datos.lineaProceso, producto: datos.producto, lote: datos.lote, fechaElaboracion: datos.fechaElaboracion, fechaVencimiento: datos.fechaVencimiento, fechaFaena: datos.fechaFaena || undefined, frigorifico: datos.frigorifico || undefined, origen: datos.origen || undefined, precio: datos.precio ? parseFloat(datos.precio) : undefined, maquinista: session?.user?.name || 'Operador' })
    setPaso(2)
  }

  const handleFoto = useCallback((tipo: 'ETIQUETA_PT' | 'MATERIA_PRIMA', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      if (tipo === 'ETIQUETA_PT') setFotoEtiqueta(base64)
      else setFotoMMPP(base64)
      if (registro) await subirFoto(registro.id, tipo, base64.split(',')[1] ?? base64, session?.user?.name || 'Operador')
    }
    reader.readAsDataURL(file)
  }, [registro, subirFoto, session])

  const handleEnviar = async () => {
    if (!registro) return
    await firmar(registro.id, { observacion: observaciones })
    setEnviado(true)
  }

  const itemsNC = registro?.checklist.filter(i => i.resultado === 'NC').length ?? 0
  const itemsC = registro?.checklist.filter(i => i.resultado !== 'NC').length ?? 0

  return (
    <div className="min-h-screen bg-[#0f0f0f] font-[Rajdhani] text-[#e8e8e8] flex flex-col max-w-lg mx-auto">
      <div className="bg-[#1a1a1a] border-b-2 border-[#CC0000] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-[#CC0000] text-white text-xs font-bold px-2 py-1 rounded">PULSE 360</span>
          <div><div className="text-sm font-bold text-white">Control de Etiquetado</div><div className="text-[11px] text-[#555]">FCP.026.001 — Maquinista</div></div>
        </div>
        <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-[#CC0000]" />
          <span className="text-[11px] text-[#888]">{session?.user?.name || 'Usuario'}</span>
        </div>
      </div>

      <div className="flex bg-[#141414] border-b border-[#1e1e1e]">
        {(['Datos','Fotos','IA','Check','Enviar'] as const).map((label, i) => {
          const n = (i+1) as Paso; const isDone = n < paso; const isActive = n === paso
          return (
            <div key={n} className={`flex-1 py-2 text-center text-[11px] font-bold border-b-[3px] ${isDone ? 'text-[#16a34a] border-[#16a34a]' : isActive ? 'text-[#CC0000] border-[#CC0000]' : 'text-[#3a3a3a] border-transparent'}`}>
              <span className={`inline-block w-[18px] h-[18px] rounded-full text-[10px] leading-[18px] text-center mr-1 ${isDone ? 'bg-[#16a34a] text-white' : isActive ? 'bg-[#CC0000] text-white' : 'bg-[#222]'}`}>{isDone ? '✓' : n}</span>{label}
            </div>
          )
        })}
      </div>

      {error && <div className="mx-4 mt-3 bg-[#1a0505] border border-[#CC0000] rounded-lg px-4 py-3 text-sm text-[#cc8888]">{error}</div>}

      {paso === 1 && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Datos generales</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 col-span-2">
                <div className="text-[10px] text-[#555] mb-1">LÍNEA DE PROCESO</div>
                <select value={datos.lineaProceso} onChange={e => setDatos(d => ({...d, lineaProceso: e.target.value}))} className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none">
                  {LINEAS.map(l => <option key={l} value={l} className="bg-[#1a1a1a]">{l}</option>)}
                </select>
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 col-span-2">
                <div className="text-[10px] text-[#555] mb-1">PRODUCTO *</div>
                <input type="text" value={datos.producto} onChange={e => setDatos(d => ({...d, producto: e.target.value}))} placeholder="Nombre del producto" className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none placeholder:text-[#333]" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
                <div className="text-[10px] text-[#555] mb-1">LOTE *</div>
                <input type="text" value={datos.lote} onChange={e => setDatos(d => ({...d, lote: e.target.value}))} placeholder="Ej: 260526" className="w-full bg-transparent text-[#CC0000] font-bold text-sm outline-none placeholder:text-[#333]" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
                <div className="text-[10px] text-[#555] mb-1">ORIGEN</div>
                <input type="text" value={datos.origen} onChange={e => setDatos(d => ({...d, origen: e.target.value}))} placeholder="Ej: Paraguay" className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none placeholder:text-[#333]" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
                <div className="text-[10px] text-[#555] mb-1">F. ELABORACIÓN *</div>
                <input type="date" value={datos.fechaElaboracion} onChange={e => setDatos(d => ({...d, fechaElaboracion: e.target.value}))} className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
                <div className="text-[10px] text-[#555] mb-1">F. VENCIMIENTO *</div>
                <input type="date" value={datos.fechaVencimiento} onChange={e => setDatos(d => ({...d, fechaVencimiento: e.target.value}))} className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
                <div className="text-[10px] text-[#555] mb-1">F. FAENA</div>
                <input type="date" value={datos.fechaFaena} onChange={e => setDatos(d => ({...d, fechaFaena: e.target.value}))} className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
                <div className="text-[10px] text-[#555] mb-1">PRECIO ($)</div>
                <input type="number" value={datos.precio} onChange={e => setDatos(d => ({...d, precio: e.target.value}))} placeholder="Ej: 18090" className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none placeholder:text-[#333]" />
              </div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 col-span-2">
                <div className="text-[10px] text-[#555] mb-1">FRIGORÍFICO</div>
                <input type="text" value={datos.frigorifico} onChange={e => setDatos(d => ({...d, frigorifico: e.target.value}))} placeholder="Ej: Belén Est. N°23" className="w-full bg-transparent text-[#e0e0e0] font-bold text-sm outline-none placeholder:text-[#333]" />
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4">
            <button onClick={handleContinuarDatos} disabled={loading} className="w-full py-4 rounded-lg bg-[#CC0000] text-white font-bold text-lg disabled:opacity-40">{loading ? 'Creando...' : 'Continuar → Fotos'}</button>
          </div>
        </>
      )}

      {paso === 2 && (
        <>
          <div className="flex-1 p-4">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Fotografías de verificación</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div onClick={() => inputEtiquetaRef.current?.click()} className={`border-2 rounded-xl h-36 flex flex-col items-center justify-center gap-2 cursor-pointer ${fotoEtiqueta ? 'border-solid border-[#4a9eff] bg-[#060d1a]' : 'border-dashed border-[#2a2a2a]'}`}>
                {fotoEtiqueta ? <img src={fotoEtiqueta} alt="Etiqueta" className="h-full w-full object-cover rounded-xl" /> : <><span className="text-3xl text-[#333]">📷</span><span className="text-[11px] text-[#444] font-bold uppercase">Etiqueta PT</span></>}
              </div>
              <input ref={inputEtiquetaRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFoto('ETIQUETA_PT', e)} />
              <div onClick={() => inputMMPPRef.current?.click()} className={`border-2 rounded-xl h-36 flex flex-col items-center justify-center gap-2 cursor-pointer ${fotoMMPP ? 'border-solid border-[#4a9eff] bg-[#060d1a]' : 'border-dashed border-[#2a2a2a]'}`}>
                {fotoMMPP ? <img src={fotoMMPP} alt="MMPP" className="h-full w-full object-cover rounded-xl" /> : <><span className="text-3xl text-[#333]">📦</span><span className="text-[11px] text-[#444] font-bold uppercase">Mat. Prima</span></>}
              </div>
              <input ref={inputMMPPRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFoto('MATERIA_PRIMA', e)} />
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setPaso(1)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Atrás</button>
            <button onClick={() => setPaso(3)} disabled={!fotoEtiqueta || !fotoMMPP || loading} className="flex-[2] py-4 rounded-lg bg-[#CC0000] text-white font-bold text-base disabled:opacity-40">{loading ? 'Subiendo...' : 'Continuar → IA'}</button>
          </div>
        </>
      )}

      {paso === 3 && (
        <>
          <div className="flex-1 p-4">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Análisis con IA</div>
            <div className="bg-[#0d1827] border border-[#1a3a5c] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#CC0000] rounded-lg flex items-center justify-center text-xl flex-shrink-0">🔍</div>
                <div><div className="text-sm font-bold text-white">Claude Vision</div><div className="text-[11px] text-[#3a5a7a] mt-0.5">Extrae campos y pre-llena el checklist automáticamente</div></div>
