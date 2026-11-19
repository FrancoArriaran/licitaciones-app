# 0004 — Jobs en Trigger.dev; n8n fuera del camino crítico

- Estado: reemplazada por ahora por [0008](0008-jobs-en-github-actions.md)
- Fecha: 2026-11-17

## Contexto

La ingesta descarga un ZIP mensual de ~80 MB, normaliza, cruza perfiles y envía mensajes. En n8n funciona, pero no se versiona ni se testea, y los errores de configuración son silenciosos.

## Decisión

Desde la Fase 1, los jobs son tareas Trigger.dev en `apps/jobs`, en TypeScript, usando los mismos casos de uso de `core`. n8n queda para automatizaciones internas no críticas.

## Alternativas consideradas

GitHub Actions cron: gratuito, válido como respaldo, pero sin reintentos por paso ni panel. Funciones serverless: límites de tiempo y memoria.

## Consecuencias

Un proveedor más (~US$10/mes). Los workflows de n8n siguen corriendo hasta que la Fase 1 los reemplace.
