'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEtiquetado } from '@/lib/hooks/useEtiquetado'

type Paso = 1 | 2 | 3 | 4
const PASOS = ['Resumen', 'Fotos', 'Checklist', 'Autorizar']

function getRolFirma(role?: string) {
  if (role === 'Calidad') return 'CALIDAD'
  if (role === 'Supervisor') return 'SUPERVISOR'
  return null
}

function fmt(fecha?: string | null): string {
  if (!fecha) return '—'
  try { return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '—' }
}

function fmtTs(ts?: string | null): string {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

export default function RevisionTablet() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const registroId = searchParams.get('id')
  const { registro, loading, error, cargarRegistro, firmar } = useEtiquetado()
  const [paso, setPaso] = useState<Paso>(1)
  const [rechazando, setRechazando] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [firmado, setFirmado] = useState(false)
  const [rechazado, setRechazado] = useState(false)

  const rolFirma = getRolFirma(session?.user?.role)

  useEffect(() => { if (registroId) cargarRegistro(registroId) }, [registroId])

  if (!registroId) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center font-[Rajdhani] text-[#555]">Sin documento seleccionado</div>
  if (loading && !registro) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center font-[Rajdhani] text-[#555]">Cargando...</div>

  const firmaCalidad = registro?.firmas.find(f => f.rol === 'CALIDAD' && !f.esRechazo)
  const firmaSuperviser = registro?.firmas.find(f => f.rol === 'SUPERVISOR' && !f.esRechazo)
  const yaFirme = registro?.firmas.some(f => f.rol === rolFirma && !f.esRechazo) ?? false
  const itemsNC = registro?.checklist.filter(i => i.resultado === 'NC').length ?? 0
  const itemsC = registro?.checklist.filter(i => i.resultado !== 'NC').length ?? 0

  const handleAutorizar = async () => {
    if (!registro || !rolFirma) return
    await firmar(registro.id, { observacion: observacion || undefined })
    setFirmado(true)
  }

  const handleRechazar = async () => {
    if (!registro || !rolFirma || !motivoRechazo.trim()) { alert('Debes ingresar el motivo'); return }
    await firmar(registro.id, { esRechazo: true, motivoRechazo: motivoRechazo.trim() })
    setRechazado(true)
  }

  if (firmado || rechazado) {
    const estaAutoriz = !!firmaCalidad && !!firmaSuperviser
    return (
      <div className="min-h-screen bg-[#0f0f0f] font-[Rajdhani] flex flex-col items-center justify-center p-8 gap-5 max-w-lg mx-auto">
        <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-4xl border-2 ${firmado ? 'border-[#16a34a] bg-[#040e06]' : 'border-[#CC0000] bg-[#0a0000]'}`}>{firmado ? '✓' : '✕'}</div>
        <div className={`text-xl font-bold text-center ${firmado ? 'text-[#16a34a]' : 'text-[#CC0000]'}`}>{firmado ? 'Autorización registrada' : 'Rechazo enviado'}</div>
        <div className="text-sm text-[#555] text-center leading-relaxed">
          {firmado && !estaAutoriz && <>Tu firma fue guardada.<br />Esperando la firma del {rolFirma === 'CALIDAD' ? 'Supervisor' : 'Analista de Calidad'}.</>}
          {firmado && estaAutoriz && <>Ambas firmas registradas.<br />Documento <strong className="text-white">AUTORIZADO</strong>.</>}
          {rechazado && <>Rechazo notificado al Maquinista.<br />Documento vuelto a <strong className="text-white">BORRADOR</strong>.</>}
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#888]">{registro?.codigo}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] font-[Rajdhani] text-[#e8e8e8] flex flex-col max-w-lg mx-auto">
      <div className="bg-[#1a1a1a] border-b-2 border-[#CC0000] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-[#CC0000] text-white text-xs font-bold px-2 py-1 rounded">PULSE 360</span>
          <div><div className="text-sm font-bold text-white">Revisión Etiquetado</div><div className="text-[11px] text-[#555]">{rolFirma === 'CALIDAD' ? 'Analista Calidad' : 'Supervisor Producción'}</div></div>
        </div>
        <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-[#4a9eff]" />
          <span className="text-[11px] text-[#888]">{session?.user?.name || 'Usuario'}</span>
        </div>
      </div>

      <div className="flex bg-[#141414] border-b border-[#1e1e1e]">
        {PASOS.map((label, i) => {
          const n = (i+1) as Paso; const isDone = n < paso; const isActive = n === paso
          return (
            <div key={n} className={`flex-1 py-2 text-center text-[11px] font-bold border-b-[3px] ${isDone ? 'text-[#16a34a] border-[#16a34a]' : isActive ? 'text-[#CC0000] border-[#CC0000]' : 'text-[#3a3a3a] border-transparent'}`}>
              <span className={`inline-block w-[18px] h-[18px] rounded-full text-[10px] leading-[18px] text-center mr-1 ${isDone ? 'bg-[#16a34a] text-white' : isActive ? 'bg-[#CC0000] text-white' : 'bg-[#222]'}`}>{isDone ? '✓' : n}</span>{label}
            </div>
          )
        })}
      </div>

      {error && <div className="mx-4 mt-3 bg-[#1a0505] border border-[#CC0000] rounded-lg px-4 py-3 text-sm text-[#cc8888]">{error}</div>}
      {yaFirme && <div className="mx-4 mt-3 bg-[#0a2a0a] border border-[#16a34a] rounded-lg px-4 py-3 text-sm text-[#4adf8a]">✓ Ya autorizaste este documento.</div>}

      {paso === 1 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Documento pendiente</div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] border-l-[3px] border-l-[#d4a017] rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="bg-[#2a1f00] text-[#d4a017] text-[10px] font-bold px-2 py-0.5 rounded">EN REVISIÓN</span>
                <span className="text-[10px] text-[#444] font-bold">{registro.codigo}</span>
              </div>
              <div className="text-base font-bold text-white mb-1">{registro.producto}</div>
              <div className="text-[11px] text-[#555]">{registro.lineaProceso} · Lote {registro.lote} · {registro.maquinista}</div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-[#141414] rounded-lg p-2"><div className="text-[9px] text-[#555] mb-1">LOTE</div><div className="text-xs font-bold text-[#CC0000]">{registro.lote}</div></div>
                <div className="bg-[#141414] rounded-lg p-2"><div className="text-[9px] text-[#555] mb-1">F. VENC.</div><div className="text-xs font-bold">{fmt(registro.fechaVencimiento)}</div></div>
                <div className="bg-[#141414] rounded-lg p-2"><div className="text-[9px] text-[#555] mb-1">CHECKLIST</div><div className={`text-xs font-bold ${itemsNC > 0 ? 'text-[#d4a017]' : 'text-[#16a34a]'}`}>{itemsC}C/{itemsNC}NC</div></div>
              </div>
            </div>
            {itemsNC > 0 && <div className="bg-[#0a0800] border border-[#3a2a00] rounded-lg px-3 py-2 flex gap-2 mb-3"><span className="text-[#d4a017]">⚠</span><span className="text-[12px] text-[#d4a017]">{itemsNC} ítem(s) con NC — revisar antes de autorizar.</span></div>}
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Estado autorizaciones</div>
            <div className="grid grid-cols-2 gap-2">
              {[{ rol: 'CALIDAD', nombre: firmaCalidad?.nombreUsuario ?? 'Analista Calidad', firmado: !!firmaCalidad, esMia: rolFirma === 'CALIDAD' }, { rol: 'SUPERVISOR', nombre: firmaSuperviser?.nombreUsuario ?? 'Supervisor', firmado: !!firmaSuperviser, esMia: rolFirma === 'SUPERVISOR' }].map(f => (
                <div key={f.rol} className={`border rounded-lg p-3 ${f.firmado ? 'border-[#16a34a] bg-[#040e06]' : f.esMia ? 'border-[#4a9eff] bg-[#040810]' : 'border-[#2a2a2a]'}`}>
                  <div className="text-[9px] text-[#555] uppercase tracking-wide mb-1">{f.rol}</div>
                  <div className="text-sm font-bold text-[#d0d0d0] mb-2">{f.nombre}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.firmado ? 'bg-[#0a2a0a] text-[#16a34a]' : f.esMia ? 'bg-[#060e1a] text-[#4a9eff]' : 'bg-[#2a1f00] text-[#d4a017]'}`}>
                    {f.firmado ? 'AUTORIZADO ✓' : f.esMia ? 'PENDIENTE TU FIRMA' : 'PENDIENTE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4">
            <button onClick={() => setPaso(2)} className="w-full py-4 rounded-lg bg-[#CC0000] text-white font-bold text-base">Revisar documento →</button>
          </div>
        </>
      )}

      {paso === 2 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Fotografías capturadas</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['ETIQUETA_PT', 'MATERIA_PRIMA'] as const).map(tipo => {
                const foto = registro.fotos.find(f => f.tipo === tipo)
                const label = tipo === 'ETIQUETA_PT' ? 'Etiqueta PT' : 'Materia Prima'
                return (
                  <div key={tipo} className="border border-[#2a2a2a] rounded-xl overflow-hidden">
                    <div className="bg-[#1e1e1e] px-3 py-2 flex items-center justify-between border-b border-[#222]">
                      <span className="text-[10px] font-bold text-[#666] uppercase">{label}</span>
                      {tipo === 'ETIQUETA_PT' && itemsNC > 0 ? <span className="bg-[#2a1f00] text-[#d4a017] text-[9px] font-bold px-2 py-0.5 rounded">{itemsNC} NC</span> : <span className="bg-[#0a1f0e] text-[#16a34a] text-[9px] font-bold px-2 py-0.5 rounded">OK</span>}
                    </div>
                    {foto ? <img src={foto.url} alt={label} className="w-full h-36 object-cover" /> : <div className="h-36 bg-[#1a1a1a] flex items-center justify-center"><span className="text-[#333] text-sm">Sin foto</span></div>}
                    <div className="bg-[#1a1a1a] px-3 py-1.5 border-t border-[#1e1e1e]"><span className="text-[9px] text-[#444]">{foto ? fmtTs(foto.timestamp) : '—'} · {foto?.operador ?? '—'}</span></div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setPaso(1)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Atrás</button>
            <button onClick={() => setPaso(3)} className="flex-[2] py-4 rounded-lg bg-[#CC0000] text-white font-bold text-base">Ver checklist →</button>
          </div>
        </>
      )}

      {paso === 3 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Checklist — solo lectura</div>
            {registro.checklist.map(item => {
              const cls = item.resultado === 'NC' ? 'border-l-[3px] border-l-[#CC0000] bg-[#130505]' : item.resultado === 'C_OBS' ? 'border-l-[3px] border-l-[#d4a017] bg-[#100e00]' : 'border-l-[3px] border-l-[#16a34a]'
              const badgeCls = item.resultado === 'NC' ? 'bg-[#2a0a0a] text-[#CC0000]' : item.resultado === 'C_OBS' ? 'bg-[#1a1200] text-[#d4a017]' : 'bg-[#0a2a0a] text-[#16a34a]'
              return (
                <div key={item.itemKey} className={`bg-[#1a1a1a] border border-[#222] rounded-lg p-3 mb-1.5 flex items-center justify-between ${cls}`}>
                  <div className="flex-1 mr-2"><div className="text-sm font-bold text-[#d0d0d0]">{item.itemNombre}</div>{item.notaIA && <div className="text-[10px] mt-0.5 text-[#555]">{item.notaIA}</div>}</div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${badgeCls}`}>{item.resultado}</span>
                </div>
              )
            })}
            {registro.observaciones && <><div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mt-4 mb-2 pb-1 border-b border-[#1e1e1e]">Observaciones</div><div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 text-sm text-[#888]">{registro.observaciones}</div></>}
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setPaso(2)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Atrás</button>
            <button onClick={() => setPaso(4)} className="flex-[2] py-4 rounded-lg bg-[#CC0000] text-white font-bold text-base">Autorizar →</button>
          </div>
        </>
      )}

      {paso === 4 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Decisión de autorización</div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-4">
              <div className="text-sm font-bold text-white mb-1">{registro.producto} — Lote {registro.lote}</div>
              <div className="text-[11px] text-[#555] mb-3">{registro.codigo}</div>
              <div className="flex gap-2"><span className="bg-[#0a1f0e] text-[#16a34a] text-[10px] font-bold px-2 py-0.5 rounded">{itemsC} C</span>{itemsNC > 0 && <span className="bg-[#1a0505] text-[#CC0000] text-[10px] font-bold px-2 py-0.5 rounded">{itemsNC} NC</span>}</div>
            </div>
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Observación opcional</div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 mb-4">
              <textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Agrega una observación..." className="w-full bg-transparent text-[#e0e0e0] text-sm outline-none resize-none min-h-[48px] placeholder:text-[#333]" />
            </div>
            {rechazando && (
              <div className="bg-[#1a0505] border border-[#3a1010] rounded-lg p-3 mb-4">
                <div className="text-[11px] font-bold text-[#CC0000] mb-2 uppercase">Motivo de rechazo</div>
                <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Describe el motivo..." className="w-full bg-transparent text-[#e0e0e0] text-sm outline-none resize-none min-h-[64px] placeholder:text-[#553333]" autoFocus />
              </div>
            )}
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4">
            {!rechazando ? (
              <div className="flex gap-3">
                <button onClick={() => setRechazando(true)} className="flex-1 py-4 rounded-lg border-2 border-[#CC0000] text-[#CC0000] font-bold text-base">✕ Rechazar</button>
                <button onClick={handleAutorizar} disabled={loading || yaFirme} className="flex-[2] py-4 rounded-lg bg-[#16a34a] text-white font-bold text-base disabled:opacity-40">{loading ? 'Autorizando...' : yaFirme ? 'Ya autorizado ✓' : '✓ Autorizar'}</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setRechazando(false)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">Cancelar</button>
                <button onClick={handleRechazar} disabled={loading || !motivoRechazo.trim()} className="flex-[2] py-4 rounded-lg bg-[#CC0000] text-white font-bold text-base disabled:opacity-40">{loading ? 'Enviando...' : '✕ Confirmar rechazo'}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
