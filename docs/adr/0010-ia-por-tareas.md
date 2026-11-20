# 0010 — IA por tareas: puertos tipados, la IA redacta y el sistema calcula

- Estado: aceptada
- Fecha: 2026-11-19

## Contexto

El nuevo alcance usa IA en varios lugares: resumen de requisitos de las bases, recomendaciones por oportunidad, orden de las alertas por relevancia, informe mensual de desempeño y, al final, preguntas sobre los datos de la empresa. Los errores tienen consecuencias reales: un requisito mal leído hace perder una licitación, y una cifra inventada destruye la confianza. Además, parte de estos usos trabaja con datos privados del cliente.

## Decisión

1. **Cada uso de IA es un puerto en `core`** con entrada y salida tipadas (`TenderBriefExtractor`, `BidAdvisor`, `PerformanceReporter`...). Los adaptadores en `infra` usan respuestas en JSON con esquema estricto, validadas con Zod.
2. **Los números los calcula el sistema** (SQL y dominio), nunca el modelo. La IA resume documentos y redacta explicaciones sobre cifras ya calculadas.
3. **Todo dato extraído cita su fuente** (página de las bases) y la interfaz lo marca como generado con IA.
4. **Modelo por tarea**: el más barato que la resuelve bien; proveedor intercambiable. API con retención cero y sin entrenamiento con datos del cliente.
5. **Lo público se calcula una vez** (resumen de bases por proceso, compartido entre empresas). Lo privado se calcula por organización y se guarda en caché.
6. **Uso medido**: cada llamada se registra en `ai_usage` con costo, y hay límites por plan.
7. **El asistente conversacional consulta con herramientas** que respetan RLS, nunca con SQL libre.

## Alternativas consideradas

- **Un asistente general con acceso a la base**: rápido de mostrar, pero difícil de controlar (cifras inventadas, fuga entre organizaciones) y caro.
- **Un solo proveedor y modelo para todo**: más simple, pero más caro y atado a un proveedor.

## Consecuencias

- Cada nueva función de IA requiere definir su puerto, su esquema y su conjunto de prueba, lo que agrega trabajo al inicio.
- La calidad se puede medir y comparar entre modelos con el mismo conjunto de prueba.
- El costo es predecible y se puede limitar por plan.
