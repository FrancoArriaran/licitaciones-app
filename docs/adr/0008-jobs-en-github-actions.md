# 0008 — Jobs en GitHub Actions mientras el volumen sea bajo

- Estado: aceptada (reemplaza por ahora a [0004](0004-jobs-trigger-dev.md))
- Fecha: 2026-11-19

## Contexto

Los flujos de n8n (sincronización diaria y aviso por WhatsApp) pasan a código en `apps/jobs`. El ADR 0004 eligió Trigger.dev. Hoy el volumen es bajo: una descarga diaria de 2–10 MB comprimidos que tarda unos 20 segundos, y una revisión por hora de avisos pendientes.

## Decisión

Los jobs corren en GitHub Actions con `schedule` (cron en UTC): sincronización a las 05:00 de Lima y avisos cada hora de 05:20 a 20:20. El código de los jobs no depende del proveedor: `apps/jobs` solo arma los casos de uso de `core` con los adaptadores de `infra`, así que moverlos a Trigger.dev u otro servicio es cambiar solo el disparador.

## Alternativas consideradas

- **Trigger.dev** (ADR 0004): panel y reintentos por paso, pero suma una cuenta y un costo que aún no se justifican.
- **Vercel Cron**: sin proveedor nuevo, pero las funciones tienen límite de tiempo y memoria.

## Consecuencias

- Gratis dentro de los minutos incluidos para repos privados (~5 min al día).
- GitHub puede retrasar un cron programado varios minutos en horas de carga. Por eso los avisos corren a los :20, con margen tras la sincronización. Además, cada corrida envía todo lo que ya tocaba enviar, así que un retraso no hace perder avisos.
- Sin reintentos por paso: si una corrida falla, GitHub avisa por correo y la siguiente corrida retoma lo pendiente, porque ambos procesos son idempotentes.
- Volver a evaluar Trigger.dev cuando haya ingesta de adjudicaciones o más de una fuente.
