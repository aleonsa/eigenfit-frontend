# Procedencia

Copia de la skill `modern-web-guidance` de [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance), versión [`v1.0.2`](https://github.com/GoogleChrome/modern-web-guidance/releases/tag/v1.0.2) (commit `2b4aa13`), bajo licencia Apache 2.0 (`LICENSE`).

## Cambios locales

- `SKILL.md`: los comandos `npx` usan `modern-web-guidance@1.0.2` en lugar de `@latest`, para no ejecutar código sin versión fija. Es la única modificación.
- `LICENSE` y este archivo no forman parte de la carpeta original.

Las guías (`guides/`) son idénticas a las del tag. No se formatean con Prettier (`.prettierignore`) para que la copia siga siendo comparable con el original.

## Actualizar

1. Descarga el tag nuevo y reemplaza `guides/` y `SKILL.md`.
2. Vuelve a fijar en `SKILL.md` la versión de `npx` y la del aviso de modificación.
3. Actualiza la versión y el commit de este archivo.
4. Revisa las notas de la release antes de abrir la PR.
