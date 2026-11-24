---
name: eigenfit-implement-change
description: Guía la implementación de un cambio acotado en eigenfit-frontend y su verificación. Úsala al crear o modificar código del frontend.
---

# Implementar un cambio en eigenfit-frontend

Adaptada de `project-implement-change` de Relevo.

## Procedimiento
1. Confirma el alcance: archivos que puedes tocar y los que no. Si trabajas junto a otros agentes, toca solo tus archivos asignados.
2. Lee el código vecino y sigue sus patrones: `hooks/useApi.ts` y `hooks/useApiQuery.ts` para datos (react-query), `components/ui/*` para primitivas, `types.ts` para tipos compartidos, navegación en `components/dashboard/navigation.ts` + `components/Dashboard.tsx`.
3. Cambios pequeños y legibles. Un componente = una unidad funcional; no fragmentes mecánicamente.
4. Tipado estricto: sin `any` salvo justificación. Fechas: guarda instantes en ISO UTC y formatea con `Intl.DateTimeFormat` en la zona de la sucursal.
5. No agregues dependencias sin acordarlo (el proyecto usa Tailwind por CDN e importmap además de Vite).
6. No modifiques el backend ni `.env*`.

## Verificación (obligatoria antes de reportar)
- `./node_modules/.bin/tsc --noEmit -p .` — la línea base tiene **4 errores preexistentes en `components/ui/ErrorBoundary.tsx`**; no debe aparecer ninguno nuevo.
- `npm run build` debe pasar.
- Si hay UI: revisa en el navegador (http://localhost:5173 si el dev server está levantado) escritorio y móvil, estados de carga/vacío/error.
- Revisa tu diff (`git diff`) antes de reportar.

## Entrega
Archivos cambiados, qué verificaste (con salida de los comandos) y qué no pudiste verificar.
