# 0009 — Sin Perú Compras: SEACE como única fuente

- Estado: aceptada
- Fecha: 2026-11-19

## Contexto

La arquitectura preveía Perú Compras (Catálogos Electrónicos y Acuerdos Marco) como segunda fuente, para inteligencia de precios de catálogo y avisos de convocatorias de incorporación. No tiene API documentada y su formato no está validado. Al mismo tiempo, el alcance creció hacia el ciclo de vida de la licitación (postulaciones, resultados, cobranzas, análisis), donde Perú Compras no participa: en los catálogos no se postula.

## Decisión

El producto trabaja solo con SEACE. Se retira el adaptador previsto `PeruComprasSource`, la tabla `catalog_orders` y las menciones en la landing y en los recursos.

## Alternativas consideradas

Mantenerlo para más adelante en el roadmap: suma incertidumbre técnica sin aportar al ciclo de vida, que es el nuevo foco.

## Consecuencias

- La inteligencia de precios sale de las adjudicaciones de SEACE, que ya traen precio unitario por ítem.
- Se pierden las compras por catálogo, un canal relevante para algunos rubros (útiles, cómputo, combustible). Si un cliente lo pide, entra como otro adaptador del puerto `ProcurementSource` sin tocar el resto.
