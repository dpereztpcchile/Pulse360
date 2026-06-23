'use client'

import { useState, useCallback } from 'react'
import {
  RegistroEtiquetadoCompleto,
  CreateRegistroDTO,
  ChecklistKey,
  ResultadoItem,
} from '@/types/etiquetado'

type ChecklistLocal = Partial<Record<ChecklistKey, { resultado: ResultadoItem; nota?: string }>>

export function useEtiquetado() {
  const [registro, setRegistro] = useState<RegistroEtiquetadoCompleto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [confianzaIA, setConfianzaIA] = useState<number | null>(null)
  const [checklistLocal, setChecklistLocal] = useState<ChecklistLocal>({})

  const handleError = (e: unknown, fallback: string) => {
    const msg = e instanceof Error ? e.message : fallback
    setError(msg)
    throw new Error(msg)
  }

  const crearRegistro = useCallback(async (data: CreateRegistroDTO) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/etiquetas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const nuevo = await res.json()
      setRegistro(nuevo); return nuevo
    } catch (e) { return handleError(e, 'Error al crear registro') }
    finally { setLoading(false) }
  }, [])

  const cargarRegistro = useCallback(async (id: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/etiquetas/${id}`)
      if (!res.ok) throw new Error('No se pudo cargar el registro')
      const data = await res.json()
      setRegistro(data); setChecklistLocal({})
    } catch (e) { handleError(e, 'Error al cargar registro') }
    finally { setLoading(false) }
  }, [])

  const subirFoto = useCallback(async (
    registroId: string,
    tipo: 'ETIQUETA_PT' | 'MATERIA_PRIMA',
    base64: string,
    operador: string
  ) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/fotos/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registroId, tipo, base64, operador }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      await cargarRegistro(registroId)
    } catch (e) { handleError(e, 'Error al subir foto') }
    finally { setLoading(false) }
  }, [cargarRegistro])

  const analizarConIA = useCallback(async (registroId: string) => {
    setAnalizando(true); setError(null)
    try {
      const res = await fetch(`/api/etiquetas/${registroId}/analizar`, { method: 'POST' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const resultado = await res.json()
      setConfianzaIA(resultado.confianza)
      await cargarRegistro(registroId)
    } catch (e) { handleError(e, 'Error en análisis de IA') }
    finally { setAnalizando(false) }
  }, [cargarRegistro])

  const actualizarItem = useCallback((
    _registroId: string,
    key: ChecklistKey,
    resultado: ResultadoItem,
    nota?: string
  ) => {
    setChecklistLocal(prev => ({ ...prev, [key]: { resultado, nota } }))
    setRegistro(prev => {
      if (!prev) return prev
      return {
        ...prev,
        checklist: prev.checklist.map(item =>
          item.itemKey === key
            ? { ...item, resultado, notaManual: nota, override: true }
            : item
        ),
      }
    })
  }, [])

  const guardarChecklist = useCallback(async (
    registroId: string,
    observaciones?: string
  ) => {
    setLoading(true); setError(null)
    try {
      const items = Object.entries(checklistLocal).map(([key, val]) => ({
        key: key as ChecklistKey,
        resultado: val!.resultado,
        notaManual: val?.nota,
      }))
      const res = await fetch(`/api/etiquetas/${registroId}/checklist`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, observaciones }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      setChecklistLocal({})
    } catch (e) { handleError(e, 'Error al guardar checklist') }
    finally { setLoading(false) }
  }, [checklistLocal])

  const firmar = useCallback(async (
    registroId: string,
    opts?: { observacion?: string; esRechazo?: boolean; motivoRechazo?: string }
  ) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/etiquetas/${registroId}/firmar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts ?? {}),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const resultado = await res.json()
      setRegistro(resultado.registro); return resultado
    } catch (e) { handleError(e, 'Error al firmar documento') }
    finally { setLoading(false) }
  }, [])

  return {
    registro, loading, error, analizando, confianzaIA,
    crearRegistro, cargarRegistro, subirFoto,
    analizarConIA, actualizarItem, guardarChecklist, firmar,
  }
}
