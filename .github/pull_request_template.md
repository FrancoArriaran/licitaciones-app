## Qué cambia y por qué

<!-- Una o dos frases. Enlaza el issue o la conversación si existe. -->

## Cómo se probó

<!-- Pasos concretos: qué hiciste en local o en el preview y qué viste. -->

## Definición de terminado ([ENGINEERING_STANDARDS.md §12](../docs/ENGINEERING_STANDARDS.md))

- [ ] Probado en local (y en el preview de Vercel cuando exista)
- [ ] `pnpm verify` en verde
- [ ] Tests del comportamiento nuevo o del bug corregido
- [ ] Si toca la base: migración nueva, RLS y test pgTAP; `pnpm db:types` actualizado
- [ ] Si toca la interfaz: estados de carga, vacío y error; celular; teclado
- [ ] Sin secretos, `any`, `console.log` ni código muerto
- [ ] ADR si es una decisión de arquitectura
