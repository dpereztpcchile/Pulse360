'use client'

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface SheetSpec {
  name: string
  rows: Record<string, unknown>[]
}

export interface ExportMeta {
  reportName: string
  plant: string
  period: string
  user: string
}

/** Exporta a Excel: una hoja "Resumen" + las hojas que se pasen. */
export function exportExcel(filename: string, summary: Record<string, unknown>[], sheets: SheetSpec[]) {
  const wb = XLSX.utils.book_new()

  const wsResumen = XLSX.utils.json_to_sheet(summary.length ? summary : [{ Sin: 'datos' }])
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  for (const s of sheets) {
    const rows = s.rows.length ? s.rows : [{ Sin: 'datos' }]
    const ws = XLSX.utils.json_to_sheet(rows)
    // Nombre de hoja máx 31 chars y sin caracteres inválidos
    const safe = s.name.replace(/[\\/?*[\]:]/g, '').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, safe || 'Hoja')
  }

  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

/**
 * Exporta a PDF: encabezado de marca PULSE 360 + captura del elemento renderizado.
 * Captura el DOM con fondo oscuro y lo escala al ancho de la página.
 */
export async function exportPdf(element: HTMLElement, meta: ExportMeta, filename: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0D0D0D',
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10
  const headerH = 24

  // ── Encabezado de marca ──
  pdf.setFillColor(13, 13, 13)
  pdf.rect(0, 0, pageW, headerH, 'F')
  // Logo textual PULSE360
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(255, 255, 255)
  pdf.text('PULSE', margin, 13)
  const pulseW = pdf.getTextWidth('PULSE')
  pdf.setTextColor(204, 0, 0)
  pdf.text('360', margin + pulseW + 0.5, 13)
  // Nombre del reporte
  pdf.setFontSize(12)
  pdf.setTextColor(255, 255, 255)
  pdf.text(meta.reportName, margin, 20)
  // Datos a la derecha: planta / período / usuario / fecha
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(170, 170, 170)
  const right = pageW - margin
  const generatedAt = new Date().toLocaleString('es-CL')
  pdf.text(`Planta: ${meta.plant}`, right, 8, { align: 'right' })
  pdf.text(`Período: ${meta.period}`, right, 12, { align: 'right' })
  pdf.text(`Generado por: ${meta.user}`, right, 16, { align: 'right' })
  pdf.text(`Fecha: ${generatedAt}`, right, 20, { align: 'right' })
  // Línea roja separadora
  pdf.setDrawColor(204, 0, 0)
  pdf.setLineWidth(0.6)
  pdf.line(0, headerH, pageW, headerH)

  // ── Imagen del reporte ──
  const imgW = pageW - margin * 2
  const imgH = (canvas.height / canvas.width) * imgW
  const img = canvas.toDataURL('image/png')

  let remaining = imgH
  let position = headerH + 4
  const availFirst = pageH - position - margin

  if (imgH <= availFirst) {
    pdf.addImage(img, 'PNG', margin, position, imgW, imgH)
  } else {
    // Pagina la imagen larga en varias páginas
    let sY = 0
    const pxPerMm = canvas.width / imgW
    // primera página
    let sliceMm = availFirst
    let slicePx = sliceMm * pxPerMm
    drawSlice(pdf, canvas, img, margin, position, imgW, sY, slicePx, sliceMm)
    remaining -= sliceMm
    sY += slicePx

    while (remaining > 0) {
      pdf.addPage()
      position = margin
      sliceMm = Math.min(pageH - margin * 2, remaining)
      slicePx = sliceMm * pxPerMm
      drawSlice(pdf, canvas, img, margin, position, imgW, sY, slicePx, sliceMm)
      remaining -= sliceMm
      sY += slicePx
    }
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

/** Dibuja una porción vertical del canvas en el PDF (para paginar capturas largas). */
function drawSlice(
  pdf: jsPDF, source: HTMLCanvasElement, _img: string,
  x: number, y: number, w: number, sourceY: number, sourceH: number, destH: number,
) {
  const tmp = document.createElement('canvas')
  tmp.width = source.width
  tmp.height = Math.min(sourceH, source.height - sourceY)
  const ctx = tmp.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#0D0D0D'
  ctx.fillRect(0, 0, tmp.width, tmp.height)
  ctx.drawImage(source, 0, sourceY, source.width, tmp.height, 0, 0, source.width, tmp.height)
  pdf.addImage(tmp.toDataURL('image/png'), 'PNG', x, y, w, destH)
}
