# CAR-629 · preview.yml con una clave duplicada

- **Sesión:** Sesión Estándares (pasada semanal del 16-nov-2026)
- **PR:** este PR (rama `ci/car-629-preview-permisos-duplicados`)
- **Estado:** En PR
- **Migración:** No

## Qué entra

#998 dejó dos veces `contents` en `permissions` del job `rama-neon` de `.github/workflows/preview.yml` (`read` y `write`). Es YAML inválido: GitHub no puede cargar el workflow de vista previa y knip falla al leerlo, así que el check `simplicidad` se cae en todo PR que traiga `main`. Queda una sola clave, `contents: write`, que incluye lectura y es la que #998 quería para borrar la rama Git al cerrar el PR.

## Qué se decidió

- PR propio y mínimo para destrabar a todos. #924 y #956 traen el mismo arreglo dentro de su trabajo; al traer `main` resuelven sin conflicto real (mismo resultado).
