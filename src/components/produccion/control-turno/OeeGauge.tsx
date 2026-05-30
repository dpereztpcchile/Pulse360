'use client'

import { classifyOee } from '@/lib/control-turno/config'

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, endDeg)
  const largeArc = Math.abs(startDeg - endDeg) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

export function OeeGauge({ value, size = 200 }: { value: number; size?: number }) {
  const oee = Math.max(0, Math.min(100, value))
  const cls = classifyOee(value)
  const cx = size / 2
  const r = size / 2 - 14
  const cy = r + 14
  const stroke = 14
  const endDeg = 180 - (oee / 100) * 180

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={cy + 18} viewBox={`0 0 ${size} ${cy + 18}`}>
        <path d={arc(cx, cy, r, 180, 0)} fill="none" stroke="#2A2A2A" strokeWidth={stroke} strokeLinecap="round" />
        <path d={arc(cx, cy, r, 180, endDeg)} fill="none" stroke={cls.color} strokeWidth={stroke} strokeLinecap="round" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white" style={{ fontSize: size * 0.22, fontWeight: 700 }}>
          {oee.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: size * 0.075, fill: cls.color, fontWeight: 600, letterSpacing: 0.5 }}>
          {cls.label.toUpperCase()}
        </text>
      </svg>
    </div>
  )
}
