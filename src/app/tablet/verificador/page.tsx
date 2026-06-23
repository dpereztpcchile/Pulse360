'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useEtiquetado } from '@/lib/hooks/useEtiquetado'

type Vista = 'lista' | 'detalle'
type SubPaso = 1 | 2 | 3 | 4

function fmt(f?: string | null) {
  if (!f) return '—'
  try { return new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '—' }
}
function fmtTs(f?: string | null) {
  if (!f) return '—'
  try { return new Date(f).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

export default function VerificadorTablet() {
  const { data: session } = useSession()
  const { registro, loading, cargarRegistro, firmar } = useEtiquetado()
  const [vista, setVista] = useState<Vista>('lista')
  const [subPaso, setSubPaso] = useState<SubPaso>(1)
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [filtro, setFiltro] = useState<'pendientes'|'todos'|'verificados'>('pendientes')
  const [firmado, setFirmado] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [firmaSim, setFirmaSim] = useState(false)

  const cargarLista = useCallback(async () => {
    setLoadingLista(true)
    try {
      const estadoParam = filtro === 'pendientes' ? 'AUTORIZADO' : filtro === 'verificados' ? 'VERIFICADO' : ''
      const res = await fetch(`/api/etiquetas${estadoParam ? `?estado=${estadoParam}` : ''}`)
      if (res.ok) { const data = await res.json(); setDocumentos(data.registros ?? []) }
    } finally { setLoadingLista(false) }
  }, [filtro])

  useEffect(() => { cargarLista() }, [cargarLista])

  const abrirDoc = async (id: string) => {
    await cargarRegistro(id)
    setSubPaso(1); setFirmado(false); setFirmaSim(false); setObservacion('')
    setVista('detalle')
  }

  const handleVerificar = async () => {
    if (!registro) return
    await firmar(registro.id, { observacion: observacion || undefined })
    setFirmado(true); cargarLista()
  }

  const pendientes = documentos.filter(d => d.estado === 'AUTORIZADO').length
  const verificados = documentos.filter(d => d.estado === 'VERIFICADO').length

  if (vista === 'lista') return (
    <div className="min-h-screen bg-[#0f0f0f] font-[Rajdhani] text-[#e8e8e8] flex flex-col max-w-lg mx-auto">
      <div className="bg-[#1a1a1a] border-b-2 border-[#CC0000] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-[#CC0000] text-white text-xs font-bold px-2 py-1 rounded">PULSE 360</span>
          <div><div className="text-sm font-bold text-white">Verificador</div><div className="text-[11px] text-[#555]">Documentos autorizados</div></div>
        </div>
        <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-[#9a6adf]" />
          <span className="text-[11px] text-[#888]">{session?.user?.name || 'Verificador'}</span>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 text-center"><div className="text-2xl font-bold text-[#9a6adf]">{pendientes}</div><div className="text-[10px] text-[#555] mt-1">PENDIENTES</div></div>
          <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 text-center"><div className="text-2xl font-bold text-[#16a34a]">{verificados}</div><div className="text-[10px] text-[#555] mt-1">VERIFICADOS</div></div>
          <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 text-center"><div className="text-2xl font-bold text-[#555]">{documentos.length}</div><div className="text-[10px] text-[#555] mt-1">TOTAL HOY</div></div>
        </div>
        <div className="flex gap-2 mb-4">
          {(['pendientes','todos','verificados'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${filtro === f ? 'border-[#9a6adf] text-[#9a6adf] bg-[#0e060e]' : 'border-[#222] text-[#555]'}`}>
              {f === 'pendientes' ? `Pend. (${pendientes})` : f === 'todos' ? `Todos (${documentos.length})` : `Verif. (${verificados})`}
            </button>
          ))}
        </div>
        {loadingLista ? <div className="text-center text-[#555] py-8">Cargando...</div> :
          documentos.length === 0 ? <div className="text-center py-12"><div className="text-4xl mb-3">✅</div><div className="text-base font-bold text-[#555]">Sin documentos pendientes</div></div> :
          documentos.map(doc => {
            const ncCount = doc.checklist?.filter((i: any) => i.resultado === 'NC').length ?? 0
            const isVerif = doc.estado === 'VERIFICADO'
            return (
              <div key={doc.id} onClick={() => !isVerif && abrirDoc(doc.id)} className={`bg-[#1a1a1a] border border-[#222] rounded-xl p-4 mb-3 ${isVerif ? 'border-l-[3px] border-l-[#16a34a] opacity-60' : 'border-l-[3px] border-l-[#9a6adf] cursor-pointer active:scale-[.99]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#444] font-bold">{doc.codigo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isVerif ? 'bg-[#0a1f0e] text-[#16a34a]' : 'bg-[#160a2a] text-[#9a6adf]'}`}>{isVerif ? 'VERIFICADO' : 'PENDIENTE'}</span>
                </div>
                <div className="text-sm font-bold text-white mb-1">{doc.producto}</div>
                <div className="text-[11px] text-[#555]">{doc.lineaProceso} · Lote {doc.lote} · {doc.maquinista}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] px-2 py-1 rounded border border-[#222] text-[#888]">Lote: <strong>{doc.lote}</strong></span>
                  {ncCount > 0 && <span className="text-[10px] px-2 py-1 rounded border border-[#3a2a00] text-[#d4a017]">NC: <strong>{ncCount}</strong></span>}
                  {doc.firmas?.filter((f: any) => !f.esRechazo && f.rol !== 'MAQUINISTA' && f.rol !== 'VERIFICADOR').map((f: any) => (
                    <span key={f.rol} className="text-[10px] font-bold bg-[#0a2a0a] text-[#16a34a] px-2 py-1 rounded">✓ {f.rol === 'CALIDAD' ? 'Calidad' : 'Supervisor'}</span>
                  ))}
                  {!isVerif && <span className="text-[10px] font-bold bg-[#160a2a] text-[#9a6adf] px-2 py-1 rounded">⏳ Verificador</span>}
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )

  const itemsNC = registro?.checklist.filter(i => i.resultado === 'NC').length ?? 0
  const itemsC = registro?.checklist.filter(i => i.resultado !== 'NC').length ?? 0
  const firmaCalidad = registro?.firmas.find(f => f.rol === 'CALIDAD' && !f.esRechazo)
  const firmaSuperviser = registro?.firmas.find(f => f.rol === 'SUPERVISOR' && !f.esRechazo)

  if (firmado) return (
    <div className="min-h-screen bg-[#0f0f0f] font-[Rajdhani] flex flex-col items-center justify-center p-8 gap-5 max-w-lg mx-auto">
      <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-4xl border-2 border-[#9a6adf] bg-[#0e060e]">✓</div>
      <div className="text-xl font-bold text-[#9a6adf] text-center">Documento VERIFICADO</div>
      <div className="text-sm text-[#555] text-center leading-relaxed">Cerrado con 3 firmas.<br/>PDF completo disponible para descarga.</div>
      <div className="bg-[#160a2a] border border-[#9a6adf] rounded-lg px-4 py-2 text-sm font-bold text-[#9a6adf]">VERIFICADO · {registro?.codigo}</div>
      <button onClick={() => window.open(`/api/etiquetas/${registro?.id}/pdf`, '_blank')} className="w-full py-3 rounded-lg border border-[#16a34a] text-[#16a34a] font-bold text-base">📄 Descargar PDF completo</button>
      <button onClick={() => { setVista('lista'); setFirmado(false) }} className="w-full py-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] font-bold text-base">← Volver a la lista</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0f0f] font-[Rajdhani] text-[#e8e8e8] flex flex-col max-w-lg mx-auto">
      <div className="bg-[#1a1a1a] border-b-2 border-[#CC0000] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setVista('lista')} className="text-[#555] text-sm mr-1">←</button>
          <span className="bg-[#CC0000] text-white text-xs font-bold px-2 py-1 rounded">PULSE 360</span>
          <div><div className="text-sm font-bold text-white">Verificación</div><div className="text-[11px] text-[#555]">{registro?.codigo ?? '...'}</div></div>
        </div>
        <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-[#9a6adf]" /><span className="text-[11px] text-[#888]">{session?.user?.name}</span>
        </div>
      </div>

      <div className="flex bg-[#141414] border-b border-[#1e1e1e]">
        {['Resumen','Fotos','Checklist','Verificar'].map((label, i) => {
          const n = (i+1) as SubPaso; const isDone = n < subPaso; const isActive = n === subPaso
          return (
            <div key={n} className={`flex-1 py-2 text-center text-[11px] font-bold border-b-[3px] ${isDone ? 'text-[#16a34a] border-[#16a34a]' : isActive ? 'text-[#9a6adf] border-[#9a6adf]' : 'text-[#3a3a3a] border-transparent'}`}>
              <span className={`inline-block w-[18px] h-[18px] rounded-full text-[10px] leading-[18px] text-center mr-1 ${isDone ? 'bg-[#16a34a] text-white' : isActive ? 'bg-[#9a6adf] text-white' : 'bg-[#222]'}`}>{isDone ? '✓' : n}</span>{label}
            </div>
          )
        })}
      </div>

      {loading && !registro && <div className="flex-1 flex items-center justify-center text-[#555]">Cargando...</div>}

      {subPaso === 1 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Documento autorizado</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="col-span-2 bg-[#1a1a1a] border border-[#222] rounded-lg p-3"><div className="text-[9px] text-[#555] mb-1">PRODUCTO</div><div className="text-sm font-bold">{registro.producto}</div></div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-2"><div className="text-[9px] text-[#555] mb-1">LOTE</div><div className="text-xs font-bold text-[#CC0000]">{registro.lote}</div></div>
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-2"><div className="text-[9px] text-[#555] mb-1">CHECKLIST</div><div className={`text-xs font-bold ${itemsNC > 0 ? 'text-[#d4a017]' : 'text-[#16a34a]'}`}>{itemsC}C / {itemsNC}NC</div></div>
            </div>
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Historial de firmas</div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden mb-3">
              {[{ rol: 'MAQUINISTA', label: 'Nivel 1 — Maquinista', firma: registro.firmas.find(f => f.rol === 'MAQUINISTA') },
                { rol: 'CALIDAD', label: 'Nivel 2 — Calidad', firma: firmaCalidad },
                { rol: 'SUPERVISOR', label: 'Nivel 2 — Supervisor', firma: firmaSuperviser },
                { rol: 'VERIFICADOR', label: 'Nivel 3 — Verificador', firma: undefined }].map((row, i) => (
                <div key={i} className={`flex items-center px-4 py-3 border-b border-[#1e1e1e] last:border-0 ${row.rol === 'VERIFICADOR' ? 'bg-[#0e060e]' : ''}`}>
                  <div className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${row.rol === 'VERIFICADOR' ? 'bg-[#9a6adf]' : row.firma ? 'bg-[#16a34a]' : 'bg-[#333]'}`} />
                  <div className="flex-1"><div className="text-[10px] text-[#555]">{row.label}</div><div className="text-sm font-bold text-[#d0d0d0]">{row.firma?.nombreUsuario ?? (row.rol === 'VERIFICADOR' ? session?.user?.name : '—')}</div></div>
                  <div className="text-right">
                    {row.firma ? <><div className="text-[10px] text-[#444]">{fmtTs(row.firma.firmadoEn)}</div><span className="text-[10px] font-bold bg-[#0a2a0a] text-[#16a34a] px-2 py-0.5 rounded">{row.rol === 'MAQUINISTA' ? 'INGRESADO' : 'AUTORIZADO'}</span></> :
                      row.rol === 'VERIFICADOR' ? <span className="text-[10px] font-bold bg-[#160a2a] text-[#9a6adf] px-2 py-0.5 rounded">TU FIRMA</span> :
                      <span className="text-[10px] text-[#333]">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setVista('lista')} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Lista</button>
            <button onClick={() => setSubPaso(2)} className="flex-[2] py-4 rounded-lg bg-[#9a6adf] text-white font-bold text-base">Ver fotos →</button>
          </div>
        </>
      )}

      {subPaso === 2 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Fotografías de verificación</div>
            <div className="grid grid-cols-2 gap-3">
              {(['ETIQUETA_PT','MATERIA_PRIMA'] as const).map(tipo => {
                const foto = registro.fotos.find(f => f.tipo === tipo)
                const label = tipo === 'ETIQUETA_PT' ? 'Etiqueta PT' : 'Materia Prima'
                return (
                  <div key={tipo} className="border border-[#2a2a2a] rounded-xl overflow-hidden">
                    <div className="bg-[#1e1e1e] px-3 py-2 flex items-center justify-between border-b border-[#222]">
                      <span className="text-[10px] font-bold text-[#666] uppercase">{label}</span>
                      {tipo === 'ETIQUETA_PT' && itemsNC > 0 ? <span className="bg-[#2a1f00] text-[#d4a017] text-[9px] font-bold px-2 py-0.5 rounded">{itemsNC} NC</span> : <span className="bg-[#0a1f0e] text-[#16a34a] text-[9px] font-bold px-2 py-0.5 rounded">OK</span>}
                    </div>
                    {foto ? <img src={foto.url} alt={label} className="w-full h-40 object-cover" /> : <div className="h-40 bg-[#1a1a1a] flex items-center justify-center"><span className="text-[#333] text-sm">Sin foto</span></div>}
                    <div className="bg-[#1a1a1a] px-3 py-1.5 border-t border-[#1e1e1e]"><span className="text-[9px] text-[#444]">{fmtTs(foto?.timestamp)} · {foto?.operador ?? '—'}</span></div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setSubPaso(1)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Atrás</button>
            <button onClick={() => setSubPaso(3)} className="flex-[2] py-4 rounded-lg bg-[#9a6adf] text-white font-bold text-base">Ver checklist →</button>
          </div>
        </>
      )}

      {subPaso === 3 && registro && (
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
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setSubPaso(2)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Atrás</button>
            <button onClick={() => setSubPaso(4)} className="flex-[2] py-4 rounded-lg bg-[#9a6adf] text-white font-bold text-base">Verificar →</button>
          </div>
        </>
      )}

      {subPaso === 4 && registro && (
        <>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-3 pb-1 border-b border-[#1e1e1e]">Verificación final</div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 mb-4">
              <div className="text-sm font-bold text-white mb-1">{registro.producto} — Lote {registro.lote}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="bg-[#0a1f0e] text-[#16a34a] text-[10px] font-bold px-2 py-0.5 rounded">{itemsC} C</span>
                {itemsNC > 0 && <span className="bg-[#1a0505] text-[#CC0000] text-[10px] font-bold px-2 py-0.5 rounded">{itemsNC} NC</span>}
                <span className="bg-[#0a1f0e] text-[#16a34a] text-[10px] font-bold px-2 py-0.5 rounded">2 auth. ✓</span>
              </div>
            </div>
            <div className="bg-[#0e060e] border-[1.5px] border-[#9a6adf] rounded-xl p-4 mb-4">
              <div className="text-sm font-bold text-[#9a6adf] mb-1">Firma de verificación</div>
              <div className="text-[11px] text-[#5a3a7a] mb-3">{session?.user?.name} — Verificador</div>
              <div onClick={() => setFirmaSim(true)} className={`h-14 border rounded-lg flex items-center justify-center cursor-pointer ${firmaSim ? 'border-[#9a6adf] bg-[#160a2a]' : 'border-dashed border-[#3a1a5a] bg-[#0a040a]'}`}>
                {firmaSim ? <span className="font-serif text-lg text-[#c090f0]">{session?.user?.name}</span> : <span className="text-[11px] text-[#5a3a7a]">Toca aquí para firmar</span>}
              </div>
            </div>
            <div className="text-[10px] font-bold tracking-[2px] text-[#CC0000] uppercase mb-2 pb-1 border-b border-[#1e1e1e]">Observación (opcional)</div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
              <textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Agrega observaciones si las hay..." className="w-full bg-transparent text-[#e0e0e0] text-sm outline-none resize-none min-h-[48px] placeholder:text-[#333]" />
            </div>
          </div>
          <div className="bg-[#1a1a1a] border-t border-[#1e1e1e] p-4 flex gap-3">
            <button onClick={() => setSubPaso(3)} className="flex-1 py-4 rounded-lg border border-[#333] text-[#666] font-bold text-base">← Atrás</button>
            <button onClick={handleVerificar} disabled={!firmaSim || loading} className="flex-[2] py-4 rounded-lg bg-[#9a6adf] text-white font-bold text-base disabled:opacity-40">{loading ? 'Verificando...' : '✓ Verificar y cerrar'}</button>
          </div>
        </>
      )}
    </div>
  )
}
