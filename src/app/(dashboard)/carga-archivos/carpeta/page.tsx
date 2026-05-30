import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FolderOpen, ArrowLeft, Download, FileSpreadsheet } from 'lucide-react'

export const dynamic = 'force-dynamic'

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const fmtDateTime = (d: Date) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default async function CarpetaPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMINISTRADOR') {
    redirect('/dashboard?error=Sin+permisos')
  }

  const archivos = await prisma.cargaPrograma.findMany({
    orderBy: { fecha: 'desc' },
    select: { id: true, archivoNombre: true, archivoTamanio: true, cargadoEn: true, archivoData: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/carga-archivos" className="text-xs text-[#666] hover:text-white flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-pulse-red" /> Archivos cargados
        </h1>
        <p className="text-sm text-[#666] mt-0.5">Programas .xlsx subidos al sistema</p>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#666] border-b border-border-dark">
              <th className="px-4 py-3 font-medium">Nombre del archivo</th>
              <th className="px-4 py-3 font-medium">Fecha de carga</th>
              <th className="px-4 py-3 font-medium text-right">Tamaño</th>
              <th className="px-4 py-3 font-medium text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {archivos.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[#555]">No hay archivos cargados.</td></tr>
            ) : archivos.map((a) => (
              <tr key={a.id} className="border-b border-border-dark hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-white">
                    <FileSpreadsheet className="w-4 h-4 text-status-ok shrink-0" /> {a.archivoNombre}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#999]">{fmtDateTime(a.cargadoEn)}</td>
                <td className="px-4 py-3 text-right text-[#999]">{fmtSize(a.archivoTamanio)}</td>
                <td className="px-4 py-3 text-center">
                  {a.archivoData ? (
                    <a href={`/api/carga-archivos/${a.id}/download`}
                      className="inline-flex items-center gap-1.5 text-xs text-pulse-red hover:text-pulse-red-hover font-medium">
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </a>
                  ) : (
                    <span className="text-xs text-[#555]" title="Archivo no almacenado (carga anterior)">No disponible</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
