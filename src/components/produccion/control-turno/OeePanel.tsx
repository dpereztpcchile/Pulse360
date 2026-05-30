'use client'

import { OeeGauge } from './OeeGauge'
import { classifyOee } from '@/lib/control-turno/config'

export interface OeeView {
  oee: number
  disponibilidad: number
  rendimiento: number
  calidad: number
  capacidadNominal: number
  produccionTeoricaMax: number
  produccionReal: number
  totalParadasMin: number
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value))
  const color = classifyOee(value).color
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#999]">{label}</span>
        <span className="font-semibold text-white">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-border-dark overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function OeePanel({ data }: { data: OeeView }) {
  const brecha = data.produccionReal - data.produccionTeoricaMax
  const fmt = (n: number) => Math.round(n).toLocaleString('es-CL')

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">OEE del turno</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="flex justify-center">
          <OeeGauge value={data.oee} />
        </div>
        <div className="space-y-4">
          <Bar label="Disponibilidad" value={data.disponibilidad} />
          <Bar label="Rendimiento" value={data.rendimiento} />
          <Bar label="Calidad" value={data.calidad} />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border-dark">
            <tr>
              <td className="py-2 text-[#999]">Capacidad nominal</td>
              <td className="py-2 text-right font-medium text-white">{fmt(data.capacidadNominal)} kg/hr</td>
            </tr>
            <tr>
              <td className="py-2 text-[#999]">Producción teórica máxima</td>
              <td className="py-2 text-right font-medium text-white">{fmt(data.produccionTeoricaMax)} kg</td>
            </tr>
            <tr>
              <td className="py-2 text-[#999]">Producción real</td>
              <td className="py-2 text-right font-medium text-white">{fmt(data.produccionReal)} kg</td>
            </tr>
            <tr>
              <td className="py-2 text-[#999]">Brecha</td>
              <td className={`py-2 text-right font-semibold ${brecha < 0 ? 'text-pulse-red' : 'text-status-ok'}`}>
                {brecha >= 0 ? '+' : ''}{fmt(brecha)} kg
              </td>
            </tr>
            <tr>
              <td className="py-2 text-[#999]">Tiempo perdido (paradas)</td>
              <td className="py-2 text-right font-medium text-white">{data.totalParadasMin} min</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
