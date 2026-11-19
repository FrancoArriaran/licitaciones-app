# 0006 — Dashboard de clientes nativo, no Power BI publicado

- Estado: aceptada
- Fecha: 2026-11-17

## Contexto

Se planteó publicar un Power BI en la web para los clientes.

## Decisión

El dashboard de mercado se construye dentro de la app sobre vistas materializadas de Postgres. Power BI queda para análisis interno con un usuario de solo lectura.

## Alternativas consideradas

"Publicar en la web" de Power BI: enlace público sin login ni filtro por cliente. Power BI Embedded: capacidad dedicada con costo mensual alto para esta etapa.

## Consecuencias

Más desarrollo en la Fase 3, a cambio de login, permisos y diseño consistentes.
