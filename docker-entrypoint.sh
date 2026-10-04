#!/bin/sh
set -e

echo "Esperando a la base de datos..."

ATTEMPTS=0
until node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => p.\$disconnect()).then(() => process.exit(0)).catch(() => process.exit(1));
" > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "No se pudo conectar a la base de datos"
    exit 1
  fi
  echo "   ...reintentando ($ATTEMPTS/30)"
  sleep 2
done

echo "Base de datos lista"

# Limpieza de datos huérfanos antes del "db push": el schema actual (desde
# PULSE360-nc) eliminó el valor NO_CONFORMIDADES del enum AlertModule. Si la
# base de producción todavía tiene filas de "alerts" con ese valor (generadas
# por versiones anteriores de la app), Postgres rechaza el
# "ALTER TYPE ... DROP VALUE" con "invalid input value for enum" y ningún
# flag de Prisma puede evitarlo (--accept-data-loss solo cubre borrado de
# tablas/columnas, no valores de enum todavía en uso). Se borran esas filas
# con SQL crudo (cast a texto) ANTES del push, usando el Prisma Client ya
# generado con el schema NUEVO (por eso no se puede filtrar por el enum
# tipado, que ya no conoce ese valor).
echo "Limpiando datos huerfanos de versiones anteriores del esquema..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const n = await p.\$executeRawUnsafe(\"DELETE FROM alerts WHERE module::text = 'NO_CONFORMIDADES'\");
    if (n > 0) console.log('   Eliminadas ' + n + ' alertas huerfanas de NO_CONFORMIDADES (modulo ya removido)');
  } catch (e) {
    console.log('   (sin datos huerfanos que limpiar: ' + e.message + ')');
  } finally {
    await p.\$disconnect();
  }
})();
" || echo "   Limpieza omitida (tabla/columna no existe aun, probablemente primer deploy)"

echo "Sincronizando esquema con la base de datos..."
# --accept-data-loss: este proyecto no usa prisma migrate (no hay carpeta de
# migraciones), sino "db push" directo en cada deploy. Sin esta flag, "db push"
# se niega a correr en modo no interactivo (como en Railway) cuando el nuevo
# schema implica borrar una tabla/columna con datos (p.ej. al reemplazar un
# modelo viejo por uno nuevo, como ocurrió con NonConformity -> NcRegistro).
# Eso hacía fallar el entrypoint completo y el deploy quedaba en estado failed.
npx prisma db push --skip-generate --accept-data-loss

if [ "$RUN_SEED" = "true" ]; then
  echo "Poblando datos de ejemplo..."
  npm run seed || echo "Seed omitido (ya habia datos)"
fi

if [ "$RESET_ADMIN" = "true" ]; then
  echo "RESET_ADMIN=true: eliminando usuarios y creando super administrador..."
  npm run reset-admin || { echo "ERROR: reset-admin fallo. Revisa RESET_ADMIN_NAME/EMAIL/PASSWORD."; exit 1; }
fi

echo "Iniciando PULSE 360..."
exec "$@"
