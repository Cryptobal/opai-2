# Configuración: 8 consultas por navegación (ADR-045)

**Estado:** en PR (rama `perf/configuracion-consultas`). Sin ticket propio: lo detectó el check `rendimiento`, que fallaba en `main` y en todos los PR con «Configuración» en 9 consultas.

## Qué entró

- `cargarIndice` (centro de Configuración) ya no llama a `core.modules.list`: los módulos activos (activo, trial o solo lectura) vienen en la identidad del request y los nombres salen del catálogo de manifests (`listarModulos`). Se mantiene la regla de permiso: sin `core:tenant.read` no se listan módulos.
- Sin cambio visible: las mismas entradas y los mismos grupos.

## Pendiente

- Ninguno.
