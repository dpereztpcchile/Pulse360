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

echo "Sincronizando esquema con la base de datos..."
npx prisma db push --skip-generate

if [ "$RUN_SEED" = "true" ]; then
  echo "Poblando datos de ejemplo..."
  npm run seed || echo "Seed omitido (ya habia datos)"
fi

echo "Iniciando PULSE 360..."
exec "$@"
