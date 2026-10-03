# PULSE 360 — Smart Plant Platform

Plataforma de gestión industrial para planta de alimentos (The Protein Company).
Construida con **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma** y **PostgreSQL 16**.
Identidad visual: tipografía **Rajdhani**, **dark mode** por defecto y rojo de marca **#CC0000**.

## Módulos

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard Operacional | `/dashboard` | KPIs, pulso de líneas, gráficos y alertas en tiempo real |
| Producción | `/produccion` | Líneas, órdenes y seguimiento OEE |
| Materias Primas | `/materias-primas` | Inventario, ingresos, consumos y alertas de stock |
| Despacho | `/despacho` | Guías de despacho, estados y historial exportable |
| No Conformidades | `/no-conformidades` | Registro, flujo de estados, causa raíz y evidencias |
| Capacidad vs Demanda | `/capacidad` | Vista semanal, planificación mensual y configuración |
| Alertas / Reportes / Usuarios | `/alertas` … | Soporte operacional y administración |

## Roles y accesos

- **Administrador**: acceso total, gestión de usuarios y configuración.
- **Supervisor**: edita/cierra NC, configura capacidades, gestiona despachos.
- **Operador**: crea registros; en mobile ve el dashboard simplificado (líneas + alertas). En el módulo de Control de Etiquetado firma como **Maquinista** (tablet).
- **Calidad**: revisa formularios históricos y valida/autoriza solicitudes de etiquetado (firma "Calidad" en el flujo de revisión).
- **Verificador**: tercero responsable de la verificación final (jefe de planta o jefe de calidad) en el módulo de Control de Etiquetado.
- **Visitante**: acceso de solo lectura muy restringido. Por defecto solo ve el Dashboard operacional; el Administrador puede habilitarle módulos puntuales desde **Configuración → Permisos por rol**.

### Permisos por rol (matriz rol × módulo)

Desde `/admin/permisos` (enlazado también desde Configuración) el Administrador puede definir a qué módulos tiene acceso cada rol no-administrador: Producción, Materias Primas, Despacho, No Conformidades, Capacidad, Alertas y Reportes. El Dashboard es siempre visible para todos los roles y Usuarios/Configuración/Carga de Archivos siguen siendo exclusivos de Administrador (no se gestionan desde la matriz). Los cambios se aplican la próxima vez que cada usuario afectado inicie sesión (los permisos viajan en el JWT de la sesión, igual que el rol).

---

## Requisitos

- **Docker** y **Docker Compose v2** (vía recomendada), o bien
- **Node.js 20+** y **PostgreSQL 16** para instalación manual.

---

## Opción A — Despliegue con Docker (recomendado) en Ubuntu 22.04

### 1. Instalar Docker Engine + Compose

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# (opcional) usar docker sin sudo
sudo usermod -aG docker $USER && newgrp docker
```

### 2. Obtener el código y configurar variables

```bash
git clone <URL_DEL_REPOSITORIO> pulse-360
cd pulse-360
cp .env.example .env
```

Edita `.env` y define como mínimo:

```bash
# Genera un secreto seguro:
openssl rand -base64 32
```

- `NEXTAUTH_SECRET` → pega el valor generado.
- `NEXTAUTH_URL` → `http://TU_DOMINIO_O_IP:3000` (o tu dominio con HTTPS detrás de un proxy).
- `POSTGRES_PASSWORD` → una contraseña fuerte.
- `RUN_SEED` → `true` **solo la primera vez** (carga datos de ejemplo).

### 3. Construir y levantar

```bash
docker compose up -d --build
```

El contenedor de la app espera a PostgreSQL, sincroniza el esquema (`prisma db push`) y,
si `RUN_SEED=true`, ejecuta el seed automáticamente. Sigue los logs:

```bash
docker compose logs -f app
```

La aplicación queda disponible en `http://TU_IP:3000`.

### 4. Apagar el seed tras la primera carga

Edita `.env` y pon `RUN_SEED=false`, luego:

```bash
docker compose up -d
```

### 5. Reset de usuarios + super administrador inicial (⚠️ destructivo)

Si necesitas **borrar todos los usuarios existentes y empezar de cero** con un único
super administrador, define en `.env` (o en las variables de entorno de Railway):

```bash
RESET_ADMIN="true"
RESET_ADMIN_NAME="Tu Nombre"
RESET_ADMIN_EMAIL="tu@email.cl"
RESET_ADMIN_PASSWORD="UnaContraseñaSegura123"
```

Redespliega (`docker compose up -d` o el redeploy de Railway). Al iniciar, el
contenedor eliminará **todos** los usuarios y sesiones activas, y creará uno solo
con rol `ADMINISTRADOR` usando esos 3 datos.

**Después de confirmar que puedes iniciar sesión**, vuelve a poner
`RESET_ADMIN="false"` y redespliega de nuevo — de lo contrario, el próximo
redeploy volverá a borrar todos los usuarios (incluido el que acabas de crear).

### Comandos útiles (Docker)

```bash
docker compose ps                          # estado de servicios
docker compose exec app npm run seed       # recargar datos de ejemplo manualmente
docker compose exec app npx prisma db push # re-sincronizar esquema
docker compose exec db psql -U pulse -d pulse360  # consola SQL
docker compose down                        # detener (conserva volúmenes/datos)
docker compose down -v                     # detener y BORRAR datos
```

---

## Opción B — Instalación manual (Ubuntu 22.04)

### 1. Node.js 20 + PostgreSQL 16

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt install -y postgresql-16
sudo systemctl enable --now postgresql
```

### 2. Crear base de datos y usuario

```bash
sudo -u postgres psql <<'SQL'
CREATE USER pulse WITH PASSWORD 'cambia-esta-clave';
CREATE DATABASE pulse360 OWNER pulse;
GRANT ALL PRIVILEGES ON DATABASE pulse360 TO pulse;
SQL
```

### 3. Configurar el proyecto

```bash
git clone <URL_DEL_REPOSITORIO> pulse-360
cd pulse-360
cp .env.example .env.local
# Edita .env.local:
#   DATABASE_URL="postgresql://pulse:cambia-esta-clave@localhost:5432/pulse360?schema=public"
#   NEXTAUTH_SECRET="<openssl rand -base64 32>"
#   NEXTAUTH_URL="http://localhost:3000"

npm ci
npm run db:push     # crea las tablas
npm run seed        # carga datos de ejemplo (opcional)
```

### 4. Build de producción y arranque

```bash
npm run build
npm run start       # sirve en http://localhost:3000
```

Para mantenerlo activo en el servidor usa un gestor de procesos (p. ej. **PM2**) o un
servicio `systemd`, y coloca **Nginx** como proxy inverso con HTTPS (Let's Encrypt).

---

## Scripts npm

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción optimizado |
| `npm run start` | Sirve el build de producción |
| `npm run seed` | Puebla la base con datos de ejemplo |
| `npm run db:push` | Sincroniza el esquema Prisma con la DB |
| `npm run db:studio` | Explorador visual de datos (Prisma Studio) |

---

## Credenciales de ejemplo (tras el seed)

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@pulse360.cl` | `Pulse360#Admin` |
| Supervisor | `supervisor1@pulse360.cl` | `Pulse360#2024` |
| Operador | `operador1@pulse360.cl` | `Pulse360#2024` |

> Cambia estas credenciales antes de exponer la plataforma en producción.

## Creación de usuarios y contraseña por defecto

Todo usuario nuevo creado desde **Admin > Usuarios** se crea automáticamente con
la contraseña temporal **`123456`**. Al iniciar sesión por primera vez (o después
de que un administrador le resetee la contraseña), el sistema lo redirige
obligatoriamente a `/cambiar-clave` y no le permite usar ninguna otra pantalla
hasta que defina una contraseña propia de al menos 8 caracteres.

Esto se controla con el campo `mustChangePassword` en el modelo `User` y se
aplica en `src/middleware.ts` sobre todas las rutas protegidas (dashboard,
admin, tablet, etc.).

---

## Notas de producción

- **HTTPS**: termina TLS en un proxy inverso (Nginx/Caddy) y ajusta `NEXTAUTH_URL` al dominio.
- **Backups**: programa `pg_dump` del volumen `pulse_pgdata`.
- **Evidencias**: los archivos subidos en No Conformidades se guardan en el volumen `pulse_uploads` (`/app/public/uploads`).
- **Responsive**: el dashboard está optimizado para tablet (1024px) y desktop (1280px+); los Operadores ven una vista simplificada en mobile.
