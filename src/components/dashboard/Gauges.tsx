import { cn } from '@/lib/utils'

/** Gauge circular completo con número central sobre fondo oscuro. */
export function CircularGauge({
  value, label, size = 120, stroke = 10,
}: {
  value: number // 0-100
  label?: string
  size?: number
  stroke?: number
}) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c
  const color = v > 90 ? '#CC0000' : v >= 80 ? '#F59E0B' : '#22C55E'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A2A" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-rajdhani font-bold text-2xl text-white leading-none">{Math.round(v)}<span className="text-sm text-[#666]">%</span></span>
        {label && <span className="text-[10px] text-[#666] uppercase tracking-wide mt-0.5">{label}</span>}
      </div>
    </div>
  )
}

/** Gauge semicircular (180°) para OEE: amarillo/verde según valor. */
export function SemiGauge({
  value, label, width = 160,
}: {
  value: number // 0-100
  label?: string
  width?: number
}) {
  const v = Math.max(0, Math.min(100, value))
  const stroke = 12
  const r = (width - stroke) / 2
  const cx = width / 2
  const cy = width / 2
  const height = width / 2 + stroke
  // Semicírculo superior: de 180° a 0°
  const semi = Math.PI * r
  const offset = semi - (v / 100) * semi
  const color = v >= 75 ? '#22C55E' : v >= 60 ? '#F59E0B' : '#CC0000'

  const arc = (rad: number) => {
    // path de un semicírculo de izquierda (180°) a derecha (0°)
    return `M ${cx - rad} ${cy} A ${rad} ${rad} 0 0 1 ${cx + rad} ${cy}`
  }

  return (
    <div className="relative flex flex-col items-center" style={{ width }}>
      <svg width={width} height={height}>
        <path d={arc(r)} fill="none" stroke="#2A2A2A" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arc(r)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={semi} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-x-0 top-[42%] flex flex-col items-center">
        <span className={cn('font-rajdhani font-bold text-3xl leading-none')} style={{ color }}>{v.toFixed(1)}</span>
        {label && <span className="text-[10px] text-[#666] uppercase tracking-wide mt-0.5">{label}</span>}
      </div>
    </div>
  )
}
