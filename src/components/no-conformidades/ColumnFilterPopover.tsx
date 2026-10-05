'use client'

import { useEffect, useRef, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  count: number
}

interface ColumnFilterPopoverProps {
  /** Opciones visibles en la lista (ya acotadas por los demás filtros activos). */
  options: FilterOption[]
  /** Set de valores seleccionados, o null si no hay filtro activo (= todo seleccionado). */
  selected: Set<string> | null
  /** Universo completo de valores posibles para esta columna (independiente de otros filtros). */
  allValues: Set<string>
  onChange: (next: Set<string> | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  align?: 'left' | 'right'
  searchable?: boolean
  /** Contenido extra arriba de la lista de opciones (ej. selector Semana/Mes). */
  header?: React.ReactNode
}

export function ColumnFilterPopover({
  options, selected, allValues, onChange, open, onOpenChange, align = 'left', searchable = false, header,
}: ColumnFilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onOpenChange])

  useEffect(() => { if (!open) setQuery('') }, [open])

  const active = selected !== null
  const effectiveSelected = selected ?? allValues
  const visibleOptions = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  function toggleValue(v: string) {
    const next = new Set(effectiveSelected)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    if (next.size === allValues.size) onChange(null)
    else onChange(next)
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenChange(!open) }}
        className={cn(
          'p-0.5 rounded transition-colors',
          active ? 'text-pulse-red' : 'text-[#666] hover:text-white'
        )}
        title="Filtrar"
      >
        <Filter className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-30 mt-1 w-56 rounded-lg border border-border-dark bg-card-dark shadow-xl p-2',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {header}

          {searchable && (
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#666]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-6 pr-2 py-1 rounded bg-bg-dark border border-border-dark text-white text-xs focus:outline-none focus:border-pulse-red"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-0.5 pb-1.5 mb-1 border-b border-border-dark">
            <button type="button" onClick={() => onChange(null)} className="text-[11px] text-[#999] hover:text-white transition-colors">
              Todo
            </button>
            <button type="button" onClick={() => onChange(new Set())} className="text-[11px] text-[#999] hover:text-white transition-colors">
              Ninguno
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {visibleOptions.length === 0 && (
              <p className="text-[11px] text-[#555] px-1 py-2 text-center">Sin coincidencias</p>
            )}
            {visibleOptions.map((o) => {
              const checked = effectiveSelected.has(o.value)
              return (
                <label key={o.value} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-bg-dark cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(o.value)}
                    className="accent-pulse-red w-3.5 h-3.5 shrink-0"
                  />
                  <span className="flex-1 text-[#ccc] truncate">{o.label}</span>
                  <span className="text-[#666] text-[10px]">{o.count}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
