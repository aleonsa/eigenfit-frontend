---
name: eigenfit-review-change
description: Revisa un cambio de eigenfit-frontend contra sus requisitos. Úsala al revisar un diff o una PR para detectar bugs, regresiones y verificaciones faltantes.
---

# Revisar un cambio

Adaptada de `project-review-change` de Relevo. Revisión de solo lectura: no modifiques archivos.

## Procedimiento
1. Lee el requisito o encargo y el diff completo (`git diff` / `git diff main...`).
2. Busca, en este orden: bugs de lógica (fechas/zonas horarias, off-by-one en rangos, estados imposibles), regresiones en vistas existentes, manejo de carga/vacío/error, accesibilidad (teclado, foco, nombres), consistencia con `eigenfit-frontend-design`, tipos laxos (`any`, casts).
3. Corre tú mismo `./node_modules/.bin/tsc --noEmit -p .` (línea base: 4 errores en `ErrorBoundary.tsx`) y `npm run build`.
4. Si el cambio es visual y faltan capturas o pruebas de interacción, pídelas; no deduzcas conformidad visual de un build.

## Entrega
Hallazgos ordenados por severidad, cada uno con archivo:línea, escenario concreto que falla y sugerencia. Indica qué verificaste y qué no.
