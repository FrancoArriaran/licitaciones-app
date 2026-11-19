# Arquitectura

> Documento vivo. Cualquier cambio de stack o de límites entre módulos se registra primero como ADR (ver §10) y luego se refleja aquí.

## 1. Contexto y objetivo

Plataforma web B2B (SaaS) para empresas peruanas, sobre todo MYPEs, que venden o quieren vender al Estado. El producto tiene tres capas de valor, en orden de prioridad:

1. **Alertas** (core): cada día, las oportunidades de SEACE (y luego Perú Compras) que encajan con el perfil de la empresa, por email y/o WhatsApp, con un dato que nadie más da gratis: **la última contratación similar, quién la ganó, a qué precio y contra cuántos postores**.
2. **Seguimiento de postulaciones**: el cliente marca a qué licitaciones entra, guarda documentos, registra su oferta y el resultado (que podemos detectar solos, ver §6.4).
3. **Inteligencia de mercado**: dashboard histórico con competidores, ganadores, precios y entidades compradoras, filtrable por rubro y región.

Acceso solo con cuenta. Las cuentas se crean por invitación después de cerrar un trato (modelo _sales-led_), igual que hacen los SaaS B2B de este rubro.

## 2. Lo que ya existe y qué pasa con ello

| Pieza actual                                                                                              | Estado                                                   | Destino en la nueva arquitectura                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint OECE `GET /api/v1/file/seace_v3/json/{año}/{mes}`                                                | Validado, responde 200 sin WAF                           | Se mantiene como fuente principal de SEACE                                                                                                            |
| `src/pipeline/normalize.py` + código JS en nodos n8n                                                      | Funciona, pero descarta adjudicaciones, postores e ítems | Se porta a TypeScript en `packages/infra/sources/seace` y se amplía (ver §6.1)                                                                        |
| Supabase Postgres (`tenders`, `documents`, `mype_profiles`, `tender_matches`, `refresh_tender_matches()`) | En producción con ~144k procesos                         | Se conserva Supabase. El esquema pasa a migraciones versionadas en `supabase/migrations`                                                              |
| n8n: sync diario, onboarding por formulario, notificación WhatsApp                                        | Prototipo validado                                       | Sale del camino crítico. El flujo core pasa a código versionado y testeado (`apps/jobs`). n8n puede quedar para automatizaciones internas no críticas |
| Clasificación de rubro con LLM sobre catálogo de 389 familias UNSPSC                                      | Validada                                                 | Se conserva como caso de uso `SuggestCategories` detrás de un puerto `LlmClassifier`                                                                  |
| Plantilla WhatsApp `licitacion_nueva` (Marketing)                                                         | En revisión en Meta                                      | Se reemplaza por una plantilla de **resumen diario** (ver §6.5)                                                                                       |
| Power BI "publicar en la web"                                                                             | Idea                                                     | **No recomendado** para clientes (ver §5.4). Power BI queda solo para análisis interno                                                                |

### Hallazgo clave en los datos

El OCDS de SEACE trae bastante más de lo que normalizamos hoy. En octubre 2026: 6,671 procesos, **3,625 con adjudicación y proveedor ganador**, 1,276 con contrato, 334 con más de un ítem. Cada ítem adjudicado trae:

- código **CUBSO** de 16 dígitos (producto exacto) además del **UNSPSC** de 8,
- cantidad, unidad y monto adjudicado, de donde sale el **precio unitario**,
- el ganador con RUC (`awards[].suppliers`) y **todos los postores** (`parties[]` con rol `tenderer`).

Esto hace viable el valor agregado de "última similar + ganador + precio" sin fuentes externas. Hoy esos campos se descartan en la normalización: es lo primero que hay que corregir.

## 3. Referentes: cómo lo hacen empresas similares

| Referente                                         | Modelo                                                                                                                                                                              | Qué tomamos                                                                                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LicitaLAB** (Chile, opera en Perú hace ~2 años) | SaaS por usuario (Capterra lo lista desde ~US$90/usuario), alertas, panel de seguimiento, análisis de precios históricos, competidores y comportamiento del comprador, asistente IA | Es el competidor directo. Confirma que seguimiento + inteligencia de precios es lo que se paga. Nuestro diferencial: WhatsApp primero, foco MYPE regional, precio unitario por producto |
| **GovSpend / Deltek GovWin** (EE.UU.)             | Venta por demo, contrato anual, onboarding con customer success                                                                                                                     | Modelo _sales-led_, cuentas por invitación, perfiles de búsqueda guardados, fichas de competidor y de entidad                                                                           |
| **Tussell** (Reino Unido)                         | Inteligencia de mercado sobre datos OCDS                                                                                                                                            | Fichas por proveedor (qué gana, dónde, a qué precio) y por comprador; datos crudos → modelo analítico                                                                                   |
| SaaS B2B en general (Linear, Notion, HubSpot)     | Organización → miembros → roles; invitación; plan con _entitlements_                                                                                                                | Multi-tenant por organización, roles, límites por plan, backoffice interno                                                                                                              |

Patrón común en todos: **la cuenta es de la empresa (organización), no de la persona**; la facturación B2B va por contrato y factura; el producto se activa con un onboarding guiado que lleva al primer "momento de valor" en minutos (ver una oportunidad real que te sirve).

## 4. Stack recomendado

Criterios: un equipo chico, un solo lenguaje de punta a punta, servicios administrados (sin servidores que mantener), escalable sin rediseño hasta miles de clientes, y reutilizar lo que ya funciona (Supabase).

| Capa                                    | Elección                                                                                                                                                       | Por qué                                                                                                                                                        | Alternativa descartada                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje                                | **TypeScript** (strict) en todo el repo                                                                                                                        | Un lenguaje para web, jobs y dominio; tipos compartidos de punta a punta                                                                                       | Python para ingesta: obliga a duplicar modelos y validaciones                                                             |
| Monorepo                                | **pnpm workspaces + Turborepo**                                                                                                                                | Paquetes compartidos, builds incrementales, CI rápido                                                                                                          | Repos separados: más fricción para un equipo chico                                                                        |
| Web (landing + app + backoffice)        | **Next.js (App Router, última estable) + React**                                                                                                               | SSR/SSG para SEO de la landing y app autenticada en el mismo proyecto; Server Components y Server Actions                                                      | SPA + API aparte: dos despliegues y peor SEO                                                                              |
| UI                                      | **Tailwind CSS + shadcn/ui (Radix)**, TanStack Table, gráficos de shadcn (Recharts), Server Actions + Zod                                                      | Componentes accesibles que viven en nuestro repo; tablas y gráficos densos para el BI interno                                                                  | Librerías de UI cerradas (MUI): más difíciles de adaptar                                                                  |
| Base de datos                           | **Supabase Postgres** (región São Paulo, la más cercana)                                                                                                       | Ya está en uso; Postgres cubre transacciones, búsqueda (`pg_trgm`, full-text en español), vectores (`pgvector`) y analítica con vistas materializadas          | Base aparte para BI: innecesaria al volumen actual (~80k procesos/año)                                                    |
| Auth                                    | **Supabase Auth** con registro público **desactivado** e invitaciones desde el backoffice; MFA para administradores                                            | Integra con RLS; soporta invitación, magic link, Google                                                                                                        | Auth propio: riesgo sin beneficio                                                                                         |
| Autorización                            | **Row Level Security** por `organization_id` + _entitlements_ por plan                                                                                         | El aislamiento entre clientes lo garantiza la base, no el código de la app                                                                                     | Filtros solo en la app: un bug filtra datos de otro cliente                                                               |
| Archivos                                | **Supabase Storage** (bucket privado por organización, políticas RLS)                                                                                          | Documentos de postulación del cliente; también guardamos los archivos crudos de SEACE para reprocesar                                                          | S3 aparte: otra credencial más                                                                                            |
| Jobs en segundo plano                   | **Trigger.dev** (tareas en TypeScript, cron, reintentos, sin límite de duración, panel de ejecuciones)                                                         | Ingesta del ZIP mensual (~80 MB) excede los límites de una función serverless; necesitamos reintentos e historial                                              | GitHub Actions cron: válido como plan B gratuito, pero sin reintentos por paso ni panel. n8n: no versionable ni testeable |
| Email                                   | **Resend + React Email**                                                                                                                                       | Plantillas como componentes React, buena entregabilidad, dominio propio con SPF/DKIM                                                                           | SMTP genérico                                                                                                             |
| WhatsApp                                | **WhatsApp Cloud API de Meta** directo, detrás de un adaptador                                                                                                 | Ya está configurado; sin intermediario ni recargo                                                                                                              | BSP (Twilio, etc.): suma costo por mensaje; se puede cambiar luego sin tocar el dominio                                   |
| LLM                                     | **OpenAI** (modelo pequeño, p. ej. `gpt-4o-mini`) detrás del puerto `LlmClassifier`                                                                            | Ya validado para mapear rubros; reemplazable                                                                                                                   | —                                                                                                                         |
| Hosting web                             | **Vercel** (plan Pro: el plan Hobby no permite uso comercial)                                                                                                  | Despliegue por push, _preview_ por rama, región São Paulo                                                                                                      | Servidor propio                                                                                                           |
| Errores                                 | **Sentry**                                                                                                                                                     | Errores de web y jobs con contexto                                                                                                                             | —                                                                                                                         |
| Analítica de producto y _feature flags_ | **PostHog**                                                                                                                                                    | Embudo de onboarding, uso de funciones, flags para lanzar por cliente                                                                                          | —                                                                                                                         |
| Anti-spam en formularios públicos       | **Cloudflare Turnstile** + rate limit (Upstash Redis)                                                                                                          | El formulario de demo será atacado por bots                                                                                                                    | —                                                                                                                         |
| Facturación                             | **Fuera de la plataforma** al inicio: contrato + transferencia + factura electrónica SUNAT (vía un OSE/PSE como Nubefact). La app solo muestra plan y vigencia | Stripe no opera con empresas peruanas y los clientes B2B piden factura SUNAT. Cobro con tarjeta (Culqi o Mercado Pago) solo cuando exista un plan autoservicio | Cobro in-app desde el día 1: complejidad sin demanda                                                                      |

**Costo fijo estimado al inicio:** Vercel Pro US$20 + Supabase Pro US$25 (el plan gratuito limita la base a 500 MB y ya estamos cerca con el histórico) + Trigger.dev ~US$10 + dominio. Resend, Sentry y PostHog arrancan en su plan gratuito. WhatsApp se paga por mensaje según la tarifa de Meta para Perú (categoría Marketing). **Total ≈ US$60–90/mes** antes de mensajes de WhatsApp.

## 5. Arquitectura

### 5.1 Estilo: monolito modular con puertos y adaptadores

Un solo producto desplegable (la web) más un _worker_ de jobs, organizados por **módulos de negocio** con límites claros. No microservicios: con un equipo chico solo agregan latencia, despliegues y fallas parciales. Si algún módulo crece (por ejemplo ingesta), ya está aislado y se puede extraer.

Dentro de cada módulo se aplica **arquitectura hexagonal**: el dominio y los casos de uso no conocen Next.js, Supabase, Resend ni Meta. Dependen de interfaces (puertos); la infraestructura las implementa (adaptadores).

```mermaid
flowchart LR
  subgraph apps
    WEB[apps/web<br/>Next.js]
    JOBS[apps/jobs<br/>Trigger.dev]
  end
  subgraph packages
    CORE[packages/core<br/>dominio + casos de uso + puertos]
    INFRA[packages/infra<br/>adaptadores: Supabase, Resend,<br/>WhatsApp, OpenAI, SEACE, Perú Compras]
    UI[packages/ui<br/>design system]
    EMAILS[packages/emails<br/>React Email]
  end
  WEB --> CORE
  JOBS --> CORE
  WEB --> UI
  WEB --> INFRA
  JOBS --> INFRA
  INFRA --> CORE
  INFRA --> EMAILS
  CORE -. no depende de .-x INFRA
```

**Regla de dependencias** (verificada en CI con `dependency-cruiser`):

- `core` no importa nada de `infra`, `apps`, Next.js ni SDKs externos.
- `infra` implementa puertos de `core`.
- `apps` arman las dependencias (composición) y exponen casos de uso por HTTP, Server Actions o tareas programadas.

### 5.2 Módulos de negocio

| Módulo          | Responsabilidad                                                          | Entidades principales                                                                                                           |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`      | Organizaciones, miembros, roles, invitaciones, plan y vigencia           | `organizations`, `memberships`, `invitations`, `subscriptions`, `plans`                                                         |
| `ingestion`     | Traer datos de fuentes, guardar crudo, normalizar, detectar cambios      | `ingestion_runs`, archivos crudos en Storage                                                                                    |
| `procurement`   | Modelo canónico de contrataciones públicas                               | `tenders`, `tender_items`, `awards`, `award_items`, `tender_participants`, `suppliers`, `buyers`, `documents`, `catalog_orders` |
| `matching`      | Perfiles de alerta y cruce con oportunidades                             | `alert_profiles`, `matches`                                                                                                     |
| `intelligence`  | Similares, estadísticas de precio, competidores                          | `tender_insights`, vistas materializadas `mv_*`                                                                                 |
| `notifications` | Canales, preferencias, consentimiento, envíos y su resultado             | `notification_preferences`, `deliveries`, `channel_consents`                                                                    |
| `workspace`     | Seguimiento de postulaciones del cliente                                 | `bids`, `bid_documents`, `bid_events`                                                                                           |
| `backoffice`    | Operación interna: alta de clientes, QA de perfiles, salud de la ingesta | Usa los anteriores con rol `platform_admin`                                                                                     |
| `marketing`     | Landing, contenido, leads                                                | `leads`                                                                                                                         |

### 5.3 Flujo de datos diario

```mermaid
sequenceDiagram
  autonumber
  participant CRON as Trigger.dev (cron 05:00 Lima)
  participant SRC as OECE /api/v1/file
  participant ST as Storage (crudo)
  participant DB as Postgres
  participant MX as Matching
  participant IN as Intelligence
  participant NT as Notifications
  CRON->>SRC: descarga mes actual (y el anterior los primeros 5 días del mes)
  CRON->>ST: guarda ZIP crudo (reproceso y auditoría)
  CRON->>DB: upsert procesos, ítems, adjudicaciones, postores (hash para detectar cambios)
  CRON->>MX: procesos nuevos o cambiados
  MX->>DB: inserta matches nuevos (idempotente)
  CRON->>IN: calcula "última similar" y estadísticas para procesos con match
  CRON->>DB: refresca vistas materializadas del dashboard
  CRON->>NT: arma resumen por organización según preferencias
  NT->>NT: email y/o WhatsApp, un envío por match y canal (idempotente)
  NT->>DB: registra cada envío con estado y id del proveedor
```

Propiedades que este diseño garantiza:

- **Idempotencia**: correr el job dos veces no duplica datos ni mensajes. Upserts por clave natural (`ocid`, `award_id`), `unique (match_id, channel)` en `deliveries`.
- **Reprocesable**: el crudo queda guardado. Si mejoramos la normalización, se reprocesa el histórico sin volver a descargar.
- **Observable**: cada corrida deja un registro en `ingestion_runs` (filas leídas, insertadas, actualizadas, errores, duración) y el panel de Trigger.dev muestra cada paso.
- **No reenvía**: un match notificado no se vuelve a enviar (ver `deliveries`); un proceso **actualizado** que el cliente sigue sí genera un aviso distinto ("cambió el cronograma", "se publicó la buena pro").

### 5.4 Por qué no Power BI "publicar en la web" para clientes

"Publicar en la web" genera un enlace **público, sin login**: cualquiera con el link ve todo, no se puede filtrar por cliente y no se puede cobrar por acceso. La alternativa con login (Power BI Embedded) requiere capacidad dedicada con un costo mensual alto para esta etapa. El dashboard para clientes se construye dentro de la app sobre vistas materializadas de Postgres, con el mismo login, permisos y diseño. Power BI sigue siendo útil para análisis interno conectándose a la misma base con un usuario de solo lectura.

### 5.5 Multi-tenancy y seguridad de datos

- Toda tabla con datos de un cliente tiene `organization_id` y **RLS activado**. Política base: el usuario ve filas de organizaciones donde es miembro (`is_org_member(organization_id)`, función `security definer`).
- Los datos públicos enriquecidos (procesos, adjudicaciones, estadísticas) se leen solo con suscripción vigente (`has_active_subscription()`). Los datos son públicos en origen; lo que vendemos es la curaduría y el cruce.
- La `service_role key` de Supabase solo existe en `apps/jobs` y en código de servidor del backoffice. Nunca en el navegador.
- Roles: `platform_admin` (nuestro equipo), `owner`, `admin`, `member` dentro de cada organización.
- Las políticas RLS se prueban con **pgTAP** en CI (ver ENGINEERING_STANDARDS.md).

## 6. Diseño de los módulos clave

### 6.1 Modelo de datos (resumen)

Capas de datos, versión liviana del patrón _medallion_:

1. **Crudo**: archivos tal cual llegan, en Storage (`raw/seace/2026/11/2026-11-17.zip`).
2. **Canónico**: tablas normalizadas, una fila por concepto real.
3. **Analítico**: vistas materializadas para dashboard y similares.

```mermaid
erDiagram
  organizations ||--o{ memberships : tiene
  organizations ||--o{ alert_profiles : configura
  organizations ||--|| subscriptions : "plan vigente"
  organizations ||--o{ bids : sigue
  alert_profiles ||--o{ matches : genera
  tenders ||--o{ matches : aparece_en
  matches ||--o{ deliveries : "se envía por"
  tenders ||--o{ tender_items : contiene
  tenders ||--o{ awards : adjudica
  awards ||--o{ award_items : detalla
  awards }o--|| suppliers : gana
  tenders ||--o{ tender_participants : "postores"
  tender_participants }o--|| suppliers : es
  tenders }o--|| buyers : convoca
  tenders ||--o{ documents : publica
  bids }o--|| tenders : sobre
  bids ||--o{ bid_documents : adjunta
```

Cambios respecto al esquema actual:

- `tender_items`: hoy guardamos un UNSPSC por proceso; el OCDS trae ítems con CUBSO, UNSPSC, cantidad y unidad. El matching y los similares trabajan a nivel ítem.
- `awards`, `award_items`, `suppliers`, `tender_participants`: nuevos. Habilitan ganador, precio unitario, cantidad de postores y fichas de competidor.
- `mype_profiles` se convierte en `alert_profiles` (una organización puede tener varios: por línea de negocio o por región) con palabras clave a incluir o excluir.
- `tender_matches.notified_at` se reemplaza por `deliveries` (un registro por canal, con estado, id del mensaje y error), porque un match puede ir por email y WhatsApp.
- Montos: se guarda moneda original y `amount_pen` (el OCDS ya trae `amount_PEN`). Fechas en `timestamptz`; se muestran en hora de Lima.

### 6.2 Fuentes de datos

| Fuente                                                 | Qué aporta                                                                 | Acceso                                                                                                              | Frecuencia            | Riesgos                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| SEACE (OCDS, OECE)                                     | Convocatorias, cronograma, documentos, adjudicaciones, postores, contratos | `GET /api/v1/file/seace_v3/json/{año}/{mes}`                                                                        | Diario (mes en curso) | Latencia de publicación por medir (ver §8); `/api/v1/releases` está detrás de un WAF |
| Perú Compras (Catálogos Electrónicos / Acuerdos Marco) | Órdenes de compra: entidad, proveedor, producto, cantidad, precio          | Buscador público de órdenes (descarga xls/csv). El dataset OCDS publicado por Open Contracting cubre solo 2021-2023 | Diario o semanal      | Sin API documentada; validar formato y estabilidad antes de comprometer la función   |
| Catálogos de referencia                                | UNSPSC, CUBSO, ubigeo                                                      | Derivados de los mismos datos                                                                                       | Al ingerir            | —                                                                                    |

Perú Compras **no es una licitación a la que se postula**: las entidades compran directo a proveedores ya incorporados en un acuerdo marco. Su valor para el cliente es doble: (1) inteligencia de precios y competidores en catálogo, y (2) alertas cuando **abre una convocatoria para incorporarse** a un acuerdo marco de su rubro. Se diseña como un adaptador más (`PeruComprasSource`) que alimenta la tabla `catalog_orders` y comparte proveedores y entidades con SEACE.

Cada fuente implementa el mismo puerto:

```ts
interface ProcurementSource {
  readonly id: SourceId;
  fetch(period: Period): Promise<RawPayload>;
  parse(raw: RawPayload): AsyncIterable<CanonicalRecord>;
}
```

Agregar una fuente nueva (por ejemplo, el PAC, ver PRODUCT.md) no toca matching, notificaciones ni la web.

### 6.3 Matching

Regla actual (validada): departamento ∩ familia UNSPSC ∩ rango de monto, con monto 0/nulo tratado como "aún sin precio". Evolución:

1. Se evalúa a **nivel ítem** (un proceso con 5 ítems puede encajar por uno solo).
2. Se agregan **palabras clave** a incluir o excluir sobre título y descripción (full-text en español con `unaccent`).
3. Cada match guarda **por qué** encajó (`reasons`: "familia 3011 Concreto", "Arequipa") para mostrarlo al cliente y depurar.
4. El cliente marca "relevante / no relevante"; esa señal se usa para ajustar el perfil.
5. Se implementa como caso de uso en `core` con la consulta en un repositorio de `infra` (una función SQL para el filtrado masivo). La lógica de negocio queda testeable sin base de datos.

### 6.4 "Última contratación similar"

Para cada ítem de un proceso con match se busca la adjudicación más reciente que cumpla, en este orden de fuerza:

| Nivel | Criterio                                                                          | Etiqueta para el cliente |
| ----- | --------------------------------------------------------------------------------- | ------------------------ |
| 1     | Mismo código **CUBSO** (producto exacto)                                          | "Mismo producto"         |
| 2     | Mismo **UNSPSC de 8 dígitos** (commodity)                                         | "Mismo tipo de producto" |
| 3     | Mismo UNSPSC de 6 dígitos (clase) + similitud de texto del ítem ≥ 0.3 (`pg_trgm`) | "Producto similar"       |

Desempates: misma entidad > mismo departamento > más reciente. Ventana: 24 meses.

Datos que se muestran:

- fecha, entidad, ganador (razón social y RUC), monto adjudicado,
- **precio unitario** = monto del ítem adjudicado / cantidad, solo si la unidad coincide,
- número de postores,
- diferencia entre lo adjudicado y el valor referencial (descuento típico),
- y, si hay suficientes datos, la mediana de precio unitario de los últimos 12 meses y los 3 proveedores que más ganan en ese producto y región.

Se calcula en el job diario solo para procesos con match y se guarda en `tender_insights`, así la alerta y la ficha no recalculan nada. Para servicios y obras, donde los códigos son genéricos, la fase 2 agrega similitud semántica con embeddings (`pgvector`).

Detección automática de resultados: como conocemos el RUC del cliente, cuando se publica la buena pro de un proceso que sigue, marcamos "Ganada" si su RUC es el adjudicatario o "No adjudicada" con el ganador y precio. Esto alimenta su historial sin que tenga que hacer nada.

### 6.5 Notificaciones

- Puerto `NotificationChannel` con adaptadores `EmailChannel` (Resend) y `WhatsAppChannel` (Meta). Agregar SMS o Telegram no toca el resto.
- **Resumen diario** por organización a la hora que elija (por defecto 07:00), en vez de un mensaje por licitación: menos costo, menos sensación de spam y más clics.
  - **WhatsApp**: plantilla Marketing con lo esencial ("Hoy tienes 4 oportunidades nuevas. La más relevante: …") y botón con URL dinámica a la app. Los parámetros de plantilla no admiten saltos de línea, por eso el detalle va en la app.
  - **Email**: el detalle completo por oportunidad, incluido el bloque "última similar".
- **Consentimiento**: opt-in explícito de WhatsApp registrado con fecha y fuente (lo exige Meta y la Ley 29733). Baja en un clic en cada canal.
- Cada envío queda en `deliveries` con estado (`queued`, `sent`, `delivered`, `read`, `failed`) actualizado por los webhooks de Resend y Meta.
- El token de WhatsApp de producción es de un **usuario de sistema** de Meta (no vence), guardado como secreto. El token temporal de 24 h solo sirve para pruebas.

## 7. Entornos y despliegue

| Entorno    | Web                                      | Base de datos                                                         | Jobs                           | Cuándo               |
| ---------- | ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------ | -------------------- |
| Local      | `pnpm dev`                               | Proyecto Supabase **dev** (gratuito) o `supabase start` si hay Docker | `trigger dev`                  | Desde ya             |
| Preview    | Vercel genera una URL por cada rama o PR | Proyecto Supabase de staging                                          | Entorno staging de Trigger.dev | Cuando haya clientes |
| Producción | Vercel desde `main`                      | Proyecto Supabase de producción                                       | Entorno prod de Trigger.dev    | Desde ya             |

Hoy: se trabaja sobre `main` con CI obligatorio en cada push, y todo cambio se prueba primero en local contra el proyecto dev, nunca contra producción. Las pruebas de RLS (pgTAP) corren en CI con una base Supabase completa en Docker, así que no hace falta Docker en la máquina de desarrollo. Al tener clientes: `main` se protege, todo entra por PR con _preview_, y se agrega el proyecto de staging. El repo ya queda preparado para ese cambio (ver ENGINEERING_STANDARDS.md §8).

Migraciones: se crean con `supabase migration new`, se aplican primero al proyecto dev (`supabase db push` con el proyecto dev enlazado), se versionan en git y luego se aplican a producción. CI valida en cada push que todas las migraciones aplican desde cero y que los tests RLS pasan. Nunca se edita una migración ya aplicada. Cambios que rompen compatibilidad se hacen en dos pasos (_expand/contract_). La puesta en marcha de cada entorno está en el [README](../README.md).

## 8. Riesgos y cómo se mitigan

| Riesgo                                                                                                                                              | Mitigación                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Latencia de la fuente**: si el archivo mensual se actualiza con días de retraso, una Adjudicación Simplificada puede cerrar antes de que avisemos | Medir desde el día 1 `ingested_at − date_published` por proceso y mostrarlo en el backoffice. Si es alto, investigar fuentes más frescas              |
| Cambios de plataforma por la Ley 32069 (OECE, PLADICOP, SEACE 4.0)                                                                                  | Las fuentes están aisladas detrás de `ProcurementSource`; tests con _fixtures_ reales detectan cambios de formato; alerta si una corrida trae 0 filas |
| Perú Compras sin API estable                                                                                                                        | Empezar por inteligencia de precios con descarga programada; no prometer alertas en tiempo real de catálogo hasta validar                             |
| Costo de WhatsApp por mensaje                                                                                                                       | Resumen diario (un mensaje por cliente al día); límite por plan                                                                                       |
| Fuga de datos entre clientes                                                                                                                        | RLS en todas las tablas de cliente + tests pgTAP en CI                                                                                                |
| Clasificación de rubro incorrecta                                                                                                                   | El cliente confirma las categorías sugeridas en el onboarding; feedback "no relevante" en cada alerta                                                 |

## 9. Estructura del repositorio

```
licitaciones/
├─ apps/
│  ├─ web/                    # Next.js 16
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ (marketing)/   # landing y solicitud de demo (público, estático)
│  │     │  ├─ (auth)/        # login, bienvenida (invitación), recuperar y nueva contraseña
│  │     │  ├─ (app)/         # producto: inicio, mi empresa (Fase 1+: oportunidades, alertas...)
│  │     │  ├─ (admin)/admin/ # backoffice interno (rol platform_admin): empresas, leads
│  │     │  └─ auth/          # confirmación de enlaces de correo y cierre de sesión
│  │     ├─ features/<f>/     # por funcionalidad: actions.ts, data.ts, components/, schemas.ts
│  │     ├─ lib/              # sesión (DAL), composición, clientes Supabase, env
│  │     └─ proxy.ts          # refresco de sesión y redirección optimista
│  └─ jobs/                   # sincronización SEACE y avisos WhatsApp (GitHub Actions, ver docs/JOBS.md)
├─ packages/
│  ├─ core/                   # dominio + casos de uso + puertos, sin dependencias de infraestructura
│  │  └─ src/<modulo>/{domain,application,ports.ts,index.ts}
│  ├─ infra/                  # adaptadores: repositorios Supabase, Turnstile (Fase 1: fuentes, canales, LLM)
│  ├─ ui/                     # design system: tokens, botones, campos, tablas, alertas
│  ├─ emails/                 # (Fase 1) plantillas React Email
│  └─ config/                 # tsconfig compartidos (ESLint y Prettier viven en la raíz)
├─ supabase/
│  ├─ migrations/             # esquema versionado (fuente de verdad)
│  ├─ tests/database/         # pgTAP: RLS y funciones SQL
│  └─ templates/              # correos de invitación y recuperación
├─ docs/                      # este documento, estándares, producto, ADRs
├─ .github/                   # CI, Dependabot, plantilla de PR
└─ legacy/                    # prototipo Python y workflows n8n (referencia, fuera del flujo productivo)
```

## 10. Decisiones de arquitectura (ADR)

Cada decisión relevante se registra en [`docs/adr/`](adr/) con la plantilla de ENGINEERING_STANDARDS.md §15. Decisiones iniciales:

| #    | Decisión                                                                | Estado                         |
| ---- | ----------------------------------------------------------------------- | ------------------------------ |
| 0001 | Monolito modular en TypeScript con arquitectura hexagonal               | Aceptada                       |
| 0002 | Supabase (Postgres, Auth, Storage) como plataforma de datos             | Aceptada                       |
| 0003 | Aislamiento multi-tenant con RLS por `organization_id`                  | Aceptada                       |
| 0004 | Jobs en Trigger.dev; n8n fuera del camino crítico                       | Reemplazada por 0008 por ahora |
| 0008 | Jobs en GitHub Actions mientras el volumen sea bajo                     | Aceptada                       |
| 0005 | Cuentas solo por invitación (_sales-led_); cobro fuera de la plataforma | Aceptada                       |
| 0006 | Dashboard de clientes nativo en la app, no Power BI publicado           | Aceptada                       |
| 0007 | Resumen diario como unidad de notificación                              | Aceptada                       |
