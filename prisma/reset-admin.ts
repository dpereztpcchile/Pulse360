// PULSE 360 - Reset de usuarios y creación de super administrador inicial
//
// Este script:
//   1. Borra todas las sesiones activas (cierra sesión a todos los usuarios)
//   2. Borra TODOS los usuarios existentes en la base de datos
//   3. Crea un único usuario nuevo con rol ADMINISTRADOR
//
// Se activa SOLO si la variable de entorno RESET_ADMIN="true" está presente
// al iniciar el contenedor (ver docker-entrypoint.sh). Los datos del nuevo
// administrador se toman de las variables de entorno:
//   RESET_ADMIN_NAME, RESET_ADMIN_EMAIL, RESET_ADMIN_PASSWORD
//
// ⚠️ IMPORTANTE: después de ejecutarlo una vez, vuelve a poner
// RESET_ADMIN="false" en Railway para que no se repita en cada redeploy.

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const name = process.env.RESET_ADMIN_NAME
  const email = process.env.RESET_ADMIN_EMAIL
  const password = process.env.RESET_ADMIN_PASSWORD

  if (!name?.trim() || !email?.trim() || !password) {
    throw new Error(
      'RESET_ADMIN=true requiere también RESET_ADMIN_NAME, RESET_ADMIN_EMAIL y RESET_ADMIN_PASSWORD'
    )
  }
  if (password.length < 8) {
    throw new Error('RESET_ADMIN_PASSWORD debe tener al menos 8 caracteres')
  }

  console.log('🧨 RESET_ADMIN=true detectado. Eliminando usuarios existentes...')

  const sesionesBorradas = await prisma.session.deleteMany()
  console.log(`   🔒 ${sesionesBorradas.count} sesión(es) cerrada(s)`)

  const usuariosBorrados = await prisma.user.deleteMany()
  console.log(`   🗑️  ${usuariosBorrados.count} usuario(s) eliminado(s)`)

  const hashed = await bcrypt.hash(password, 12)
  const normalizedEmail = email.toLowerCase().trim()

  const admin = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: UserRole.ADMINISTRADOR,
      active: true,
    },
  })

  console.log('✅ Nuevo super administrador creado:')
  console.log(`   👤 ${admin.name}`)
  console.log(`   📧 ${admin.email}`)
  console.log('   🔑 (contraseña definida por RESET_ADMIN_PASSWORD)')
  console.log('')
  console.log('⚠️  Recuerda volver a poner RESET_ADMIN="false" en las variables de entorno')
  console.log('    para que este proceso no se repita en el próximo redeploy.')
}

main()
  .catch((e) => {
    console.error('❌ Error en reset-admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
