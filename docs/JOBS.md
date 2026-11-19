# Procesos automáticos (jobs)

Dos procesos reemplazan a los flujos de n8n. Son código del repo (`apps/jobs`), con tests, y corren en GitHub Actions ([ADR 0008](adr/0008-jobs-en-github-actions.md)).

| Proceso                 | Cuándo                           | Qué hace                                                                                                                                   | Reemplaza al flujo de n8n       |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| **Sincronizar SEACE**   | 05:00 Lima, todos los días       | Descarga el archivo del mes de SEACE, actualiza `tenders` y `documents`, registra la corrida en `sync_runs` y calcula coincidencias nuevas | "SEACE - Sincronizacion diaria" |
| **Avisos por WhatsApp** | Cada hora, de 05:20 a 20:20 Lima | Envía un mensaje por cada coincidencia pendiente con la plantilla `licitacion_nueva` y la marca como notificada                            | "Notificar matches pendientes"  |

El flujo "Onboarding - Mapeo de rubro mype" (formulario + IA) no se migra: lo reemplaza la pantalla **Alertas** de la web, que usa la misma clasificación con IA.

## Qué es igual a n8n

- **Misma fuente**: `contratacionesabiertas.oece.gob.pe/api/v1/file/seace_v3/json/{año}/{mes}/`, con el mismo encabezado.
- **Mismas filas**: la normalización es una copia línea por línea de los nodos "Normalizar tenders" y "Normalizar documents". Se comparó contra el código de n8n con los archivos reales de octubre y noviembre de 2026: 12 769 procesos y 36 802 documentos, cero diferencias.
- **Mismo mensaje**: plantilla `licitacion_nueva` en idioma `en`, con los mismos cinco datos (empresa, código del proceso, entidad, monto, fin de consultas) y los mismos textos de respaldo ("0.00", "por confirmar").
- **Mismos perfiles del prototipo**: lee `tender_matches` y `mype_profiles` con la misma consulta y los avisa a las 7:00.

## Qué cambia (correcciones)

- **Calcula coincidencias**: el flujo de n8n exportado no llamaba a `refresh_tender_matches()`, así que nunca generaba avisos nuevos. Ahora, tras cada carga, se calculan las del prototipo y las de los clientes de la web (`refresh_alert_matches()`).
- **Documentos después de procesos**: n8n cargaba ambos en paralelo y un documento podía llegar antes que su proceso.
- **Duplicados del archivo**: SEACE repite algunos documentos; se conserva la última versión, como hacía la carga fila por fila.
- **Cambio de mes**: los primeros 5 días del mes también se relee el mes anterior, para no perder lo publicado a última hora. Si el mes nuevo aún no existe (SEACE responde 404), no es un error.
- **Hora de Lima**: el mes y las fechas del mensaje se calculan en hora de Lima, no en la del servidor.
- **Reintentos**: si un envío falla, solo esa coincidencia queda pendiente y se reintenta en la siguiente hora; las demás se envían igual. Lo enviado nunca se repite.
- **Clientes de la web**: reciben el mismo mensaje si activaron WhatsApp con consentimiento en Alertas > Canales, desde la hora que eligieron. Si dos perfiles de una empresa coinciden con la misma licitación, se envía un solo mensaje.
- **Registro**: cada corrida deja una fila en `sync_runs` (mes, procesos, documentos, estado, error).

## Puesta en marcha

1. Sube el repo a GitHub (privado), como indica el README.
2. En el repositorio: **Settings > Secrets and variables > Actions > New repository secret**, crea:

   | Secreto                    | Valor                                                            |
   | -------------------------- | ---------------------------------------------------------------- |
   | `SUPABASE_URL`             | URL del proyecto (la misma de `NEXT_PUBLIC_SUPABASE_URL`)        |
   | `SUPABASE_SECRET_KEY`      | Clave _secret_ del proyecto                                      |
   | `WHATSAPP_ACCESS_TOKEN`    | Token de un **usuario de sistema** de Meta (no vence)            |
   | `WHATSAPP_PHONE_NUMBER_ID` | _Phone number ID_ de WhatsApp > API Setup (el que estaba en n8n) |

3. En **Actions**, abre "Sincronizar SEACE" > **Run workflow** para probarlo. Luego "Avisos por WhatsApp" > **Run workflow** con "Solo listar" marcado: muestra lo que se enviaría (con teléfonos enmascarados) sin enviar nada.
4. Cuando ambos funcionen, **apaga los tres flujos en n8n** (interruptor _Active_). Si quedan encendidos, los avisos del prototipo saldrían dos veces.

Si una corrida falla, GitHub envía un correo al dueño del repositorio, y el detalle queda en **Actions**.

## Correrlos en tu computadora

`apps/jobs/.env.local` (ignorado por git; plantilla en `apps/jobs/.env.example`) ya tiene la conexión a Supabase. Para enviar WhatsApp agrega también las dos variables de Meta.

```bash
pnpm jobs:sync
pnpm jobs:notify --dry-run
```

`pnpm jobs:notify` sin `--dry-run` envía de verdad.

## Para quien cambie el código

- Lógica de negocio en `packages/core/src/ingestion` y `packages/core/src/notifications` (con tests); adaptadores en `packages/infra/src/ingestion` y `packages/infra/src/notifications`; `apps/jobs` solo arma las piezas.
- Los jobs usan la clave _secret_ (rol `service_role`). Un permiso nuevo va en una migración, con su test en `supabase/tests/database/jobs_privileges.test.sql`.
- Ambos procesos son idempotentes: correrlos dos veces no duplica filas ni mensajes.
