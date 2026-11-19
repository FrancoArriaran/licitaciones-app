# Licitaciones

SaaS B2B que avisa a empresas peruanas de licitaciones del Estado (SEACE, Perú Compras) que encajan con su negocio, con inteligencia de precios y ganadores.

Antes de cambiar código, lee:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): stack, módulos, flujo de datos, modelo de datos.
- [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md): reglas obligatorias de código, seguridad, testing y git.
- [docs/PRODUCT.md](docs/PRODUCT.md): usuarios, flujos, pantallas, tono de los textos.

## Reglas que no se negocian

- `packages/core` no importa infraestructura (Next.js, Supabase, SDKs, `process.env`, `Date.now()`).
- Toda tabla con datos de cliente lleva `organization_id`, RLS y un test pgTAP de aislamiento.
- El esquema solo cambia con una migración nueva en `supabase/migrations`. Nunca se edita una aplicada.
- Toda entrada externa se valida con Zod. El `organization_id` sale de la sesión, nunca del cliente.
- Jobs idempotentes: correrlos dos veces no duplica datos ni mensajes.
- Secretos solo en variables de entorno. Nunca en archivos del repo.
- Código en inglés; documentación y textos de interfaz en español, sin jerga técnica para el cliente.
- Antes de dar algo por terminado: `pnpm verify` en verde y la Definición de terminado de ENGINEERING_STANDARDS.md §12.

## Estado actual

Fase 0 completa y Fase 1 en marcha: cuentas por invitación (enlaces de un solo uso, sin SMTP), backoffice (planes, leads), alertas (perfiles con sugerencia de rubros por IA, vista previa, canales) e inicio con coincidencias. La ingesta de SEACE y los avisos por WhatsApp son jobs en `apps/jobs` sobre GitHub Actions, que reemplazan a n8n con el mismo resultado (ver docs/JOBS.md). Siguiente: ingesta de adjudicaciones y "última similar" (ARCHITECTURE.md §6.4).

## Gotchas de este repo

- Next.js 16: el middleware se llama `proxy.ts`; lee `node_modules/next/dist/docs/` antes de usar APIs que no conozcas.
- `redirect()` dentro de un `try` lo maneja `toFormError` con `unstable_rethrow`; no captures errores de Next a mano.
- `unwrap()` de `@licitaciones/infra` convierte errores de Supabase en excepciones con el nombre de la operación.
- `database.types.ts` se regenera tras cada migración (`pnpm db:types:dev`); el CI falla si no coincide.
- Comandos de base remota solo con `pnpm db:*` (enmascaran la conexión). Nunca imprimir valores de `.env.local` ni de archivos con claves.
- En SEACE, `tenders.title` es el código del proceso; el texto legible es `description` (usar `formatTenderDescription`).
- El proyecto Supabase no da permisos automáticos a los roles de la API: cada tabla nueva necesita `grant` explícito además de RLS. Las funciones también: los jobs (`service_role`) necesitan `grant execute` de cada función que llaman, incluidas las que se usan dentro de otra.
- Sin Docker local: los tests pgTAP corren en CI.
