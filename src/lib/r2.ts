/**
 * Cliente de Cloudflare R2 (almacenamiento de archivos).
 * R2 es compatible con la API de Amazon S3, por lo que usamos el SDK oficial de AWS
 * apuntando al endpoint de Cloudflare.
 *
 * Variables de entorno requeridas (ver .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.R2_BUCKET_NAME || ''

let client: S3Client | null = null

/** Indica si las variables de R2 están configuradas. */
export function r2Enabled(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && BUCKET,
  )
}

function getClient(): S3Client {
  if (client) return client
  if (!r2Enabled()) {
    throw new Error('R2 no está configurado (faltan variables de entorno R2_*)')
  }
  client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

/**
 * Sube un archivo a R2.
 * @param key Ruta/nombre del archivo dentro del bucket, p. ej. "fotos/abc123/etiqueta_1.jpg"
 * @param body Contenido del archivo
 * @param contentType Tipo MIME, p. ej. "image/jpeg"
 * @returns la misma key (para guardar en la base de datos y luego recuperarla)
 */
export async function r2Upload(key: string, body: Buffer, contentType: string): Promise<string> {
  const s3 = getClient()
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return key
}

/** Descarga un archivo de R2 y lo devuelve como Buffer. */
export async function r2Download(key: string): Promise<{ buffer: Buffer; contentType?: string }> {
  const s3 = getClient()
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await res.Body!.transformToByteArray()
  return { buffer: Buffer.from(bytes), contentType: res.ContentType }
}

/** Elimina un archivo de R2 (no falla si ya no existe). */
export async function r2Delete(key: string): Promise<void> {
  const s3 = getClient()
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
