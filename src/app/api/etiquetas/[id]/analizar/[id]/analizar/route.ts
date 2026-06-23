import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { ResultadoItem, ChecklistKey } from '@/types/etiquetado'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `Eres un inspector de calidad experto en etiquetado de productos cárnicos de The Protein Company (Chile).
Recibirás dos fotografías: una del producto terminado y otra de la materia prima.
Analiza ambas imágenes y completa el checklist FCP.026.001.
Para cada ítem indica resultado: "C" (Cumple), "NC" (No Cumple) o "C_OBS" (Cumple con observación) y una nota breve.
Responde ÚNICAMENTE con JSON válido sin texto adicional:
{
  "confianza": <0-100>,
  "camposExtraidos": { "producto": "", "lote": "", "fechaElaboracion": "", "fechaVencimiento": "", "fechaFaena": "", "frigorifico": "", "origen": "", "precio": "", "codigoBarras": "" },
  "checklist": [
    { "key": "nombre_producto", "resultado": "C", "nota": "" },
    { "key": "lote", "resultado": "C", "nota": "" },
    { "key": "condiciones_almacenamiento", "resultado": "C", "nota": "" },
    { "key": "ingredientes", "resultado": "C", "nota": "" },
    { "key": "fecha_elaboracion", "resultado": "C", "nota": "" },
    { "key": "fecha_vencimiento", "resultado": "C", "nota": "" },
    { "key": "fecha_faena", "resultado": "C", "nota": "" },
    { "key": "frigorifico_origen_sif", "resultado": "C", "nota": "" },
    { "key": "info_nutricional", "resultado": "C", "nota": "" },
    { "key": "resolucion_sanitaria", "resultado": "C", "nota": "" },
    { "key": "codigo_sap_sku", "resultado": "C", "nota": "" },
    { "key": "codigo_barras", "resultado": "C", "nota": "" },
    { "key": "precio", "resultado": "C", "nota": "" },
    { "key": "peso_contenido", "resultado": "C", "nota": "" },
    { "key": "cabezal_1", "resultado": "C", "nota": "" },
    { "key": "cabezal_2", "resultado": "C", "nota": "" }
  ],
  "observaciones": ""
}`

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const registroId = params.id
  const registro = await prisma.registroEtiquetado.findUnique({
    where: { id: registroId }, include: { fotos: true },
  })

  if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  if (registro.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo se puede analizar en estado BORRADOR' }, { status: 400 })

  const fotoEtiqueta = registro.fotos.find(f => f.tipo === 'ETIQUETA_PT')
  const fotoMMPP = registro.fotos.find(f => f.tipo === 'MATERIA_PRIMA')

  if (!fotoEtiqueta?.base64 || !fotoMMPP?.base64)
    return NextResponse.json({ error: 'Se requieren ambas fotos para el análisis' }, { status: 400 })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fotoEtiqueta.base64 } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fotoMMPP.base64 } },
          { type: 'text', text: `Analiza las etiquetas del producto "${registro.producto}", lote ${registro.lote}. Primera imagen: etiqueta producto terminado. Segunda: etiqueta materia prima.` },
        ],
      }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
    const analisis = JSON.parse(rawText.replace(/```json|```/g, '').trim())
    const tokensUsados = response.usage.input_tokens + response.usage.output_tokens
    const itemsNC = analisis.checklist.filter((i: { resultado: string }) => i.resultado === 'NC').length
    const itemsAprobados = analisis.checklist.length - itemsNC

    await prisma.$transaction(async (tx) => {
      await tx.analisisIA.upsert({
        where: { registroId },
        create: { registroId, confianza: analisis.confianza, modeloUsado: 'claude-sonnet-4-20250514', camposExtraidos: analisis.camposExtraidos, itemsAprobados, itemsNC, observacionesIA: analisis.observaciones, tokensUsados },
        update: { confianza: analisis.confianza, camposExtraidos: analisis.camposExtraidos, itemsAprobados, itemsNC, observacionesIA: analisis.observaciones, tokensUsados, procesadoEn: new Date() },
      })

      for (const item of analisis.checklist as Array<{ key: ChecklistKey; resultado: ResultadoItem; nota: string }>) {
        await tx.checklistItem.updateMany({
          where: { registroId, itemKey: item.key },
          data: { resultado: item.resultado, resultadoIA: item.resultado, notaIA: item.nota, override: false },
        })
      }

      await tx.fotoEtiquetado.updateMany({ where: { registroId }, data: { base64: null } })
    })

    const checklistActualizado = await prisma.checklistItem.findMany({ where: { registroId }, orderBy: { orden: 'asc' } })
    return NextResponse.json({ confianza: analisis.confianza, camposExtraidos: analisis.camposExtraidos, checklist: checklistActualizado, itemsAprobados, itemsNC, observaciones: analisis.observaciones, tokensUsados })
  } catch (error) {
    console.error('Error en análisis IA:', error)
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: 'La IA devolvió una respuesta no parseable. Intenta nuevamente.' }, { status: 502 })
    return NextResponse.json({ error: 'Error al procesar el análisis de IA' }, { status: 500 })
  }
}
