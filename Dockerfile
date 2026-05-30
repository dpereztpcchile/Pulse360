# =============================================
# PULSE 360 — Smart Plant Platform
# Imagen de producción (Next.js 14 + Prisma)
# =============================================

# ---- Stage 1: dependencias + build ----
FROM node:20-alpine AS builder
# libc6-compat openssl: requerido por algunos binarios nativos (Prisma) en Alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Instalar dependencias (incluye devDependencies para el build)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- Stage 2: runner de producción ----
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Copiar artefactos necesarios desde el builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p ./public/uploads && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

# El entrypoint sincroniza el esquema y arranca el servidor
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]

