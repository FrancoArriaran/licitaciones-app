# Licitaciones

Plataforma B2B que avisa cada mañana a empresas peruanas de las licitaciones del Estado que pueden ganar, con el precio y el ganador de la última contratación similar, y les ayuda a seguir sus postulaciones y entender su mercado.

## Documentación

| Documento                                                      | Para qué                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                   | Stack, arquitectura, modelo de datos, flujo diario, entornos, riesgos                     |
| [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md) | Reglas de código (SOLID, reutilización), seguridad, testing, git, definición de terminado |
| [docs/PRODUCT.md](docs/PRODUCT.md)                             | Usuarios, onboarding, operación diaria, pantallas, alertas, roadmap, métricas             |
| [docs/JOBS.md](docs/JOBS.md)                                   | Procesos automáticos: sincronización de SEACE y avisos por WhatsApp (reemplazan a n8n)    |
| [docs/adr/](docs/adr/)                                         | Decisiones de arquitectura                                                                |
| [CLAUDE.md](CLAUDE.md)                                         | Reglas resumidas para agentes de IA que trabajen en el repo                               |

## Qué hay hoy

- **Web pública**: landing y solicitud de demo con captcha (Turnstile). Las solicitudes llegan al backoffice.
- **Cuentas**: empresas con plan y vigencia, usuarios por invitación, roles (responsable, administrador, miembro), login, recuperación de contraseña.
- **Invitaciones sin correo**: al invitar se genera un enlace de un solo uso (24 h) para copiar o enviar por WhatsApp. Si vence, se genera uno nuevo desde la lista del equipo.
- **Alertas**: el cliente describe qué vende, la IA le sugiere categorías del Estado, elige regiones y montos, y ve una vista previa con procesos reales de los últimos 30 días. Configura canales (correo, WhatsApp con consentimiento) y la hora del resumen.
- **Inicio**: las oportunidades que coinciden con sus perfiles, calculadas en la base cada día.
- **Mi empresa**: equipo, invitaciones, renovar enlaces, quitar miembros.
- **Backoffice** (`/admin`): alta de empresas con enlace para el responsable, editar plan, vigencia, usuarios y estado (pausar, cancelar), equipo de cada empresa, leads con estado.
- **Seguridad**: aislamiento por empresa con RLS en Postgres, probado con tests pgTAP en CI.
- **Calidad**: TypeScript estricto, ESLint, Prettier, reglas de capas, tests, hooks de git y CI.

- **Procesos automáticos** (`apps/jobs`, en GitHub Actions): cada día a las 5:00 descarga SEACE, actualiza procesos y documentos y calcula coincidencias; cada hora envía los avisos de WhatsApp pendientes. Reemplazan a los flujos de n8n con el mismo resultado; ver [docs/JOBS.md](docs/JOBS.md).

## Comandos

| Comando                    | Qué hace                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| `pnpm install`             | Instala dependencias y activa los hooks de git                            |
| `pnpm dev`                 | Levanta la web en http://localhost:3000                                   |
| `pnpm verify`              | Formato, lint, reglas de capas, tipos y tests (lo mismo que corre el CI)  |
| `pnpm build`               | Build de producción                                                       |
| `pnpm admin:create correo` | Crea un administrador interno e imprime su enlace para crear contraseña   |
| `pnpm db:status`           | Qué migraciones están aplicadas en la base de `SUPABASE_DB_URL`           |
| `pnpm db:push`             | Aplica las migraciones pendientes (pide confirmación)                     |
| `pnpm db:types:dev`        | Regenera los tipos de TypeScript desde esa base                           |
| `pnpm db:test`             | Tests pgTAP de RLS (requiere Docker; en CI corren siempre)                |
| `pnpm jobs:sync`           | Corre la sincronización de SEACE contra la base de `apps/jobs/.env.local` |
| `pnpm jobs:notify`         | Envía los avisos de WhatsApp pendientes (`--dry-run` solo los lista)      |

Los comandos `db:*` leen `SUPABASE_DB_URL` de `apps/web/.env.local` y nunca muestran la conexión en pantalla.

## Puesta en marcha

### 1. Requisitos

- Node.js 22 y pnpm 9: `npm install -g pnpm@9`
- Un proyecto de Supabase. Docker es opcional: los tests de base de datos corren en CI.

### 2. Variables de entorno

Copia `.env.example` a `apps/web/.env.local` y complétalo:

- **Project Settings > API Keys**: URL del proyecto, clave _publishable_ y clave _secret_.
- **Connect > Session pooler** (puerto 5432): `SUPABASE_DB_URL`, con la contraseña de la base. Si la contraseña tiene `#`, `?`, `/` o `%`, deben ir codificados (`%23`, `%3F`, `%2F`, `%25`).
- `OPENAI_API_KEY`: para sugerir categorías en la configuración de alertas.
- Las claves de Turnstile del ejemplo son las de prueba oficiales de Cloudflare y sirven tal cual en local.

### 3. Base de datos

```bash
pnpm db:status
pnpm db:push
pnpm db:types:dev
```

Commitea el `database.types.ts` generado: el CI verifica que coincida con las migraciones. Si el proyecto ya tenía el esquema del prototipo (tablas `tenders`, `documents`, etc.), antes del primer `db:push` marca la migración base como aplicada:

```bash
node scripts/supabase-remote.mjs migration repair 20261117000000 --status applied
```

En el dashboard, en **Authentication**:

1. **Sign In / Providers**: desactiva _Allow new users to sign up_ (las cuentas solo se crean por invitación).
2. **URL Configuration**: Site URL `http://localhost:3000` (o el dominio real) y Redirect URL `<site>/auth/confirm`.
3. **Emails > Templates**: pega en _Reset password_ el contenido de `supabase/templates/recovery.html` (y en _Invite user_ el de `invite.html`, para cuando haya SMTP).

### 4. Primer administrador

```bash
pnpm admin:create tu-correo@dominio.pe
```

Crea la cuenta (o le da permisos si ya existe) e imprime un enlace de un solo uso para crear la contraseña. Con `pnpm dev` levantado, abre el enlace, crea tu contraseña y entrarás a `/admin`. Repite el comando para cada persona de tu equipo. Córrelo en tu terminal: el enlace da acceso a la cuenta, no lo compartas.

### 5. Producción (cuando toque)

- Proyecto Supabase separado del de desarrollo, con las mismas migraciones (`pnpm db:push` con su `SUPABASE_DB_URL`).
- Configuración de Authentication del paso 3 con el dominio real.
- SMTP propio (Resend) en **Authentication > Emails > SMTP Settings**, para recuperar contraseñas y, más adelante, enviar invitaciones automáticas.
- Un sitio en Cloudflare Turnstile con claves reales.
- En Vercel, las variables de `.env.example` con los valores de producción (sin `SUPABASE_DB_URL`, que solo se usa en local).

## Repositorio remoto

El repo aún no tiene remoto. Para publicarlo en GitHub (privado), crea el repositorio vacío en github.com y luego:

```bash
git remote add origin https://github.com/<usuario>/licitaciones.git
git push -u origin main
```

El CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) correrá en cada push a `main`. Los procesos automáticos necesitan además sus secretos en GitHub: ver [docs/JOBS.md](docs/JOBS.md#puesta-en-marcha).

## Secretos

Ninguna clave va en el repositorio. En local se usa `apps/web/.env.local` (ignorado por git); en producción, las variables de entorno de Vercel.
