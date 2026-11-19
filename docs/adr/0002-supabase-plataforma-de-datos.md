# 0002 — Supabase (Postgres, Auth, Storage) como plataforma de datos

- Estado: aceptada
- Fecha: 2026-11-17

## Contexto

El histórico de SEACE (~144 mil procesos) ya está en Supabase. Necesitamos autenticación, archivos de clientes y analítica sobre los mismos datos.

## Decisión

Seguir con Supabase en la región São Paulo. El esquema se versiona en `supabase/migrations`; el esquema existente entra como migración base marcada como aplicada en producción.

## Alternativas consideradas

Base aparte para BI o un proveedor de auth separado: más piezas y credenciales sin necesidad al volumen actual.

## Consecuencias

Plan Pro desde ya (el gratuito limita la base a 500 MB). Dependemos de RLS para el aislamiento (ver 0003).
