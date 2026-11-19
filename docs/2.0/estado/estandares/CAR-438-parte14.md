# CAR-438 · Limpieza 3, parte 14: módulo Finanzas y packages sin solapar PRs abiertos

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-438-componentes-web-1f57`
- **Estado:** En PR
- **Migración:** No

## Qué entra

24 exportaciones sin uso menos (**246 → 222**):

- **Web (sin tocar ramas #1011–#1035):** `estado-ficha`, solicitudes `plan-conversion`, CPQ `esquemas-tipos`, agente `tipos`.
- **modules/finanzas:** zona flujo, parser CSV, constantes vista previa recurrentes; eliminado `filasDesdeCsv` muerto.
- **packages:** reexports duplicados en `finanzas/index` y `remuneraciones/index`; `claveDePlataforma` y `promediosDePagoPorCliente` internos; `REFERENCIA` fixture; código muerto `consumoDeEjecucion` y `solicitudPendiente`.

879 tests web + cobros/bordes en verde.

Fixes CAR-438