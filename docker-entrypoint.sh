#!/bin/sh
set -e

echo "⏳ Esperando a la base de datos..."
# Espera activa hasta que Postgres acepte conexiones (máx ~60s)
ATTEMPTS=0
until npx prisma db push --skip-generate >/tmp/prisma.log 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "❌ No se pudo conectar a la base de datos:"
    cat /tmp/prisma.log
    exit 1
  fi
  echo "   ...reintentando ($ATTEMPTS/30)"
  sleep 2
done
echo "✅ Esquema sincronizado con la base de datos"

# Seed opcional: ejecutar una sola vez con RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Poblando datos de ejemplo..."
  npm run seed || echo "⚠️  El seed falló o ya había datos (continuando)"
fi

echo "🚀 Iniciando PULSE 360..."
exec "$@"
