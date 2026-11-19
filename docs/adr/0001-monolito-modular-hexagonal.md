# 0001 — Monolito modular en TypeScript con arquitectura hexagonal

- Estado: aceptada
- Fecha: 2026-11-17

## Contexto

Equipo chico, un producto con alertas, seguimiento e inteligencia de mercado que comparten datos. El prototipo mezclaba Python, JavaScript en nodos de n8n y SQL suelto.

## Decisión

Un monorepo pnpm + Turborepo en TypeScript estricto. Una app web (Next.js) y, desde la Fase 1, un worker de jobs. La lógica de negocio vive en `packages/core` sin dependencias de infraestructura; los adaptadores en `packages/infra`. `dependency-cruiser` hace cumplir la regla en CI.

## Alternativas consideradas

- Microservicios: más despliegues, latencia y fallas parciales sin beneficio a esta escala.
- Python para ingesta y TypeScript para la web: duplica modelos y validaciones.

## Consecuencias

Tipos compartidos de punta a punta y tests rápidos del dominio sin base de datos. Un módulo que crezca (por ejemplo, ingesta) ya está aislado y se puede extraer.
