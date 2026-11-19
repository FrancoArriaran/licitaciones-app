# Estándares de ingeniería

Reglas obligatorias para todo el código del repo, escrito por personas o por agentes de IA. Si una regla estorba en un caso concreto, se discute en el PR y, si se cambia, se cambia aquí.

**Idioma**: código, nombres, commits y comentarios en **inglés**. Documentación, textos de la interfaz y mensajes al cliente en **español**.

---

## 1. Principios

| Principio                       | En la práctica                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claridad sobre astucia**      | El código se lee 10 veces más de lo que se escribe. Nombres largos y explícitos antes que abreviaturas                                             |
| **KISS**                        | La solución más simple que cumple el requisito actual                                                                                              |
| **YAGNI**                       | Nada de abstracciones "por si acaso". Se generaliza cuando aparece el segundo o tercer caso real                                                   |
| **DRY con criterio**            | Se extrae lógica duplicada a la **tercera** repetición (regla de tres). Dos bloques parecidos que cambian por razones distintas no son duplicación |
| **Fallar rápido y en el borde** | Toda entrada externa se valida al entrar (formularios, webhooks, archivos de SEACE, respuestas del LLM). Dentro del sistema se confía en los tipos |
| **Seguro por defecto**          | RLS activado, secretos fuera del código, permisos mínimos                                                                                          |

## 2. SOLID aplicado a este proyecto

**S — Responsabilidad única.** Cada módulo, clase o función tiene una sola razón para cambiar.

- `SeaceOcdsParser` solo transforma OCDS en registros canónicos. No escribe en la base ni decide matches.
- Un componente React no consulta la base y además formatea montos y además maneja el formulario: se separa en página (datos), componente (presentación) y utilidades (`formatPen`).

**O — Abierto/cerrado.** Se extiende agregando, no modificando.

- Nueva fuente (Perú Compras, PAC) = nuevo adaptador de `ProcurementSource`. Nuevo canal (SMS) = nuevo adaptador de `NotificationChannel`. El caso de uso `SendDailyDigest` no cambia.

**L — Sustitución de Liskov.** Cualquier implementación de un puerto se puede usar en lugar de otra sin sorpresas.

- `InMemoryTenderRepository` (tests) y `SupabaseTenderRepository` (producción) cumplen el mismo contrato, incluidos los errores que lanzan.

**I — Segregación de interfaces.** Interfaces chicas y específicas.

- `TenderReader` (lectura) separado de `TenderWriter` (ingesta). La web solo recibe `TenderReader`.

**D — Inversión de dependencias.** El dominio depende de abstracciones; la infraestructura se inyecta.

```ts
// packages/core/src/notifications/ports.ts
export interface NotificationChannel {
  readonly kind: ChannelKind;
  send(message: DigestMessage, recipient: Recipient): Promise<DeliveryResult>;
}

// packages/core/src/notifications/application/send-daily-digest.ts
export class SendDailyDigest {
  constructor(
    private readonly matches: PendingMatchReader,
    private readonly channels: ReadonlyMap<ChannelKind, NotificationChannel>,
    private readonly deliveries: DeliveryLog,
    private readonly clock: Clock,
  ) {}
  // ...
}

// apps/jobs/src/composition.ts  <- único lugar que conoce las implementaciones concretas
const sendDailyDigest = new SendDailyDigest(
  new SupabasePendingMatchReader(db),
  new Map([
    ["email", new ResendEmailChannel(resend)],
    ["whatsapp", new MetaWhatsAppChannel(meta)],
  ]),
  new SupabaseDeliveryLog(db),
  systemClock,
);
```

## 3. Arquitectura en el código

### 3.1 Capas y regla de dependencias

```
apps (web, jobs)      -> composición, HTTP, UI, cron
packages/infra        -> adaptadores (Supabase, Resend, Meta, OpenAI, fuentes)
packages/core         -> dominio + casos de uso + puertos   (no importa NADA de arriba)
```

- `core` es TypeScript puro: sin `next`, sin `@supabase/*`, sin `fetch` directo, sin `process.env`, sin `Date.now()` (se inyecta `Clock`).
- Se verifica en CI con `dependency-cruiser`. Un import que rompe la regla rompe el build.

### 3.2 Estructura de un módulo en `core`

```
packages/core/src/matching/
├─ domain/          # entidades y value objects (AlertProfile, Match, AmountRange), reglas puras
├─ application/     # casos de uso (CreateAlertProfile, FindNewMatches), uno por archivo
├─ ports.ts         # interfaces que la infraestructura implementa
└─ index.ts         # API pública del módulo: lo único que otros módulos importan
```

Un módulo no importa archivos internos de otro módulo, solo su `index.ts`.

### 3.3 Reutilización

| Qué                                                                      | Dónde vive                                             | Regla                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| Componentes visuales genéricos (Button, DataTable, StatCard, EmptyState) | `packages/ui`                                          | Sin lógica de negocio ni llamadas a datos                                 |
| Componentes de negocio (OpportunityCard, SimilarAwardPanel)              | `apps/web/src/features/<feature>/components`           | Reciben datos por props                                                   |
| Formateo (moneda, fechas Lima, RUC, ubigeo)                              | `packages/core/src/shared/format`                      | Una sola implementación; prohibido `toLocaleString` suelto en componentes |
| Esquemas Zod de entrada                                                  | Junto al caso de uso que validan                       | Se reutilizan en el formulario (cliente) y en la Server Action (servidor) |
| Tipos de la base                                                         | Generados con `supabase gen types` en `packages/infra` | Nunca escritos a mano                                                     |
| Plantillas de email                                                      | `packages/emails`                                      | Componentes React con props tipadas                                       |

## 4. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Prohibido `any` (usar `unknown` y validar). Prohibido `@ts-ignore` (si hace falta, `@ts-expect-error` con motivo).
- Prohibido el operador `!` de non-null salvo en tests.
- Tipos de dominio con _branded types_ para identificadores que se confunden: `Ruc`, `Ocid`, `OrganizationId`.
- Montos: nunca `number` suelto en el dominio para dinero. Value object `Money { amount: number; currency: "PEN" | "USD" }` con operaciones explícitas. En la base, `numeric`.
- Fechas: `timestamptz` en la base; en código, objetos `Date` en UTC; se convierten a `America/Lima` solo al mostrar.
- Exportaciones nombradas; sin `export default` salvo donde Next.js lo exige (páginas, layouts).

## 5. Manejo de errores y validación

- **Validación en el borde con Zod**: formularios, Server Actions, Route Handlers, webhooks, archivos de fuentes, respuestas del LLM, variables de entorno (`env.ts` falla al arrancar si falta una variable).
- **Errores de dominio tipados**: `class ProfileLimitReached extends DomainError`. La capa web los traduce a mensajes en español para el usuario.
- **Errores esperados vs. inesperados**: los esperados (validación, límite de plan, no encontrado) se devuelven como resultado y se muestran al usuario. Los inesperados se lanzan, llegan a Sentry y el usuario ve un mensaje genérico con un id de referencia.
- Prohibido `catch {}` vacío. Si se captura, se maneja o se relanza con contexto.
- Mensajes al usuario: dicen qué pasó y qué hacer. "No pudimos enviar la invitación porque ese correo ya pertenece a otra empresa. Pide a esa persona que salga de su empresa actual o usa otro correo."

## 6. Base de datos

- El esquema vive en `supabase/migrations`. **Nunca** se cambia el esquema desde el dashboard de Supabase en producción.
- Una migración aplicada no se edita: se crea otra.
- Cambios incompatibles en dos pasos (_expand/contract_): agregar columna nueva → migrar datos y código → eliminar la vieja en otro despliegue.
- Nombres en `snake_case`, tablas en plural, claves foráneas `<entidad>_id`, timestamps `created_at` / `updated_at` en todas las tablas.
- **Toda tabla con datos de cliente**: columna `organization_id`, `alter table ... enable row level security`, políticas explícitas y test pgTAP que pruebe que otra organización **no** puede leer ni escribir.
- Índices para cada clave foránea y cada filtro frecuente del dashboard. Toda consulta nueva del dashboard se revisa con `explain analyze` contra datos reales.
- Operaciones masivas (ingesta, matching) en funciones SQL o en lotes; nunca fila por fila desde la app.
- Jobs idempotentes: upsert por clave natural y restricciones `unique` que impidan duplicados aunque el código falle.

## 7. Seguridad

Referencia: OWASP ASVS nivel 1 como mínimo.

| Tema                 | Regla                                                                                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secretos             | Solo en variables de entorno (Vercel, Trigger.dev, `.env.local` ignorado por git). Nunca en el repo, en issues ni en el chat. `gitleaks` en CI (y en local si está instalado). Un secreto expuesto se **rota** de inmediato, aunque se haya borrado |
| Claves de Supabase   | `anon key` en el navegador está bien (RLS protege). `service_role key` solo en servidor y jobs                                                                                                                                                      |
| Autorización         | Toda Server Action y Route Handler verifica sesión, membresía y rol antes de hacer nada. Nunca se confía en un `organization_id` que venga del cliente: se obtiene de la sesión                                                                     |
| Entradas             | Validación Zod; consultas siempre parametrizadas (el cliente de Supabase lo hace; prohibido concatenar SQL)                                                                                                                                         |
| Salidas              | React escapa por defecto; prohibido `dangerouslySetInnerHTML` salvo contenido sanitizado del CMS                                                                                                                                                    |
| Formularios públicos | Turnstile + rate limit por IP; respuestas que no revelen si un correo existe                                                                                                                                                                        |
| Webhooks             | Verificación de firma (Meta: `X-Hub-Signature-256`; Resend: firma Svix) antes de procesar                                                                                                                                                           |
| Archivos subidos     | Bucket privado, políticas por organización, límite de tamaño y tipos permitidos (PDF, DOCX, XLSX, ZIP), URLs firmadas de corta duración                                                                                                             |
| Cabeceras            | CSP, HSTS, `X-Frame-Options`, `Referrer-Policy` configuradas en `next.config`                                                                                                                                                                       |
| Dependencias         | Renovate o Dependabot; `pnpm audit` falla el CI con vulnerabilidades altas; CodeQL en GitHub                                                                                                                                                        |
| Datos personales     | Ley 29733: política de privacidad, consentimiento registrado por canal, derecho de baja y eliminación. No se loguean teléfonos, correos ni tokens                                                                                                   |
| Cuentas internas     | MFA obligatorio para `platform_admin`                                                                                                                                                                                                               |

## 8. Flujo de trabajo con git

### Hoy (sin clientes)

- Rama única `main`. Commits directos permitidos **solo si** `pnpm verify` (lint + typecheck + tests) pasa en local; el hook de pre-push lo ejecuta.
- CI corre en cada push a `main`; si falla, arreglarlo es la prioridad.
- Todo cambio se prueba primero contra el proyecto Supabase dev (o `supabase start` si hay Docker), nunca directo en producción.

### Desde el primer cliente

- `main` protegida: solo entra por Pull Request con CI en verde.
- Ramas cortas desde `main`: `feat/…`, `fix/…`, `chore/…`. Vida máxima sugerida: 2–3 días.
- Cada PR genera un _preview_ en Vercel contra la base de staging para probar antes de producción.
- _Merge_ con _squash_. `main` siempre desplegable.
- Funciones a medio hacer se ocultan con _feature flags_ (PostHog), no con ramas largas.

### Commits

[Conventional Commits](https://www.conventionalcommits.org), validados con `commitlint`:

```
feat(matching): evaluate alert profiles at item level
fix(ingestion): keep awards with zero-amount items
chore(deps): bump next
```

## 9. Testing

| Nivel               | Herramienta             | Qué cubre                                                                                                       | Meta                                                                           |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Unitario            | Vitest                  | Dominio y casos de uso de `core` con repositorios en memoria: matching, similares, formateo, parsers de fuentes | ≥ 80 % de líneas en `core`                                                     |
| Contrato de fuentes | Vitest + _fixtures_     | Registros OCDS reales guardados en `packages/infra/test/fixtures`. Si SEACE cambia el formato, el test falla    | Un fixture por caso raro conocido (monto 0, multi-ítem, USD, sin adjudicación) |
| Integración         | Vitest + Supabase local | Repositorios y funciones SQL contra Postgres real                                                               | Cada repositorio                                                               |
| Seguridad de datos  | pgTAP                   | Políticas RLS: aislamiento entre organizaciones, permisos por rol                                               | Cada tabla con `organization_id`                                               |
| E2E                 | Playwright              | Flujos críticos: login, aceptar invitación, onboarding, ver oportunidad, seguirla, subir documento              | Los 6 flujos, en cada PR (desde que haya PRs)                                  |

Reglas:

- Un bug corregido viene con el test que lo habría detectado.
- Los tests no dependen del orden ni de la hora real (se inyecta `Clock`).
- No se mockea la base en tests de integración: se usa la base local.

## 10. Frontend

- **Server Components por defecto.** `"use client"` solo donde hay interactividad, lo más abajo posible en el árbol.
- Lectura de datos en Server Components; escritura con Server Actions que llaman a un caso de uso. Los componentes no llaman al SDK de Supabase directamente: usan funciones de `features/<feature>/data.ts`.
- Organización por funcionalidad: `apps/web/src/features/opportunities/{components,data.ts,actions.ts,schemas.ts}`.
- Formularios: Server Action + `useActionState`, con el esquema Zod validando en el servidor y los errores por campo devueltos en `FormState` (`apps/web/src/lib/form-state.ts`) y mostrados con `<Field>`. Funcionan sin JavaScript y conservan lo escrito tras un error. react-hook-form solo para formularios complejos que necesiten validación en vivo.
- Los `<select>` no controlados llevan `key` con el valor enviado (antes del spread de props): React ignora cambios de `defaultValue` en un select ya montado.
- Estados obligatorios en toda vista con datos: cargando (_skeleton_), vacío (con acción sugerida), error (con reintento).
- Accesibilidad WCAG 2.1 AA: navegación por teclado, foco visible, contraste, `label` en cada campo. Los componentes de Radix/shadcn ya lo resuelven; no romperlo.
- Responsive: las vistas de alerta y ficha de oportunidad se diseñan **primero para celular** (el cliente llega desde WhatsApp). El dashboard de mercado se diseña primero para escritorio.
- Textos de interfaz centralizados por funcionalidad, en español claro, sin jerga técnica (ver PRODUCT.md §5).

## 11. Observabilidad

- Logs estructurados (JSON) con `requestId` / `runId`, `organizationId` y módulo. Sin datos personales.
- Sentry en web y jobs, con _release_ por commit.
- Cada job registra inicio, fin, filas procesadas y errores en su tabla de corridas.
- Alertas internas: corrida de ingesta fallida, corrida con 0 filas, tasa de envíos fallidos > 5 %, latencia de publicación > 24 h.

## 12. Definición de terminado

Un cambio está terminado cuando:

- [ ] Cumple el criterio de aceptación y se probó en local (y en _preview_ cuando exista).
- [ ] `pnpm verify` pasa: lint, typecheck, tests unitarios y de integración.
- [ ] Tiene tests del comportamiento nuevo o del bug corregido.
- [ ] Si toca la base: migración nueva, RLS y test pgTAP si hay datos de cliente.
- [ ] Si toca la interfaz: estados de carga, vacío y error; funciona en celular; accesible por teclado.
- [ ] No agrega secretos, `any`, `console.log` ni código muerto.
- [ ] Si es una decisión de arquitectura, tiene su ADR.

## 13. Checklist de revisión de código

1. ¿Hace lo que dice el PR y nada más?
2. ¿Respeta la regla de dependencias (`core` sin infraestructura)?
3. ¿Valida toda entrada externa? ¿Verifica sesión, organización y rol?
4. ¿Una tabla nueva con datos de cliente tiene RLS y test?
5. ¿Es idempotente si es un job?
6. ¿Los nombres explican la intención sin comentarios?
7. ¿Duplica algo que ya existe en `packages/ui` o `core/shared`?
8. ¿Los mensajes al usuario están en español claro y dicen qué hacer?

## 14. Herramientas que hacen cumplir estas reglas

| Herramienta                                                              | Hace cumplir                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| ESLint (`typescript-eslint` strict, `eslint-plugin-jsx-a11y`) + Prettier | Estilo, `any`, accesibilidad básica                                   |
| `dependency-cruiser`                                                     | Regla de dependencias entre capas y módulos                           |
| Husky + lint-staged + commitlint                                         | Formato y lint en cada commit; mensajes convencionales                |
| gitleaks                                                                 | Secretos en commits                                                   |
| GitHub Actions                                                           | `lint → typecheck → test → build → db lint → pgTAP` en cada push o PR |
| Renovate / Dependabot + CodeQL                                           | Dependencias al día y análisis estático de seguridad                  |
| `supabase db lint`                                                       | Errores comunes en funciones y políticas SQL                          |

## 15. Plantilla de ADR

```md
# NNNN — Título corto de la decisión

- Estado: propuesta | aceptada | reemplazada por NNNN
- Fecha: AAAA-MM-DD

## Contexto

Qué problema hay y qué restricciones aplican.

## Decisión

Qué se decidió.

## Alternativas consideradas

Qué más se evaluó y por qué no.

## Consecuencias

Qué se gana, qué se pierde y qué queda pendiente.
```
