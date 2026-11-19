# 0003 — Aislamiento multi-tenant con RLS por organización

- Estado: aceptada
- Fecha: 2026-11-17

## Contexto

Varias empresas comparten la plataforma; un error que muestre datos de otra empresa es inaceptable.

## Decisión

Toda tabla con datos de cliente lleva `organization_id` y políticas RLS basadas en membresía (`is_org_member`, `has_org_role`). Los datos de contrataciones se leen solo con suscripción vigente (`has_active_subscription`). La app usa el cliente del usuario; la clave secreta solo se usa para la API de administración de Auth y para guardar leads tras el captcha. Cada política tiene tests pgTAP en CI.

## Alternativas consideradas

Filtrar solo en el código de la app: un olvido filtra datos.

## Consecuencias

Las reglas de permisos existen en dos lugares (core y SQL) y deben mantenerse alineadas; los tests de ambos lados lo vigilan.
