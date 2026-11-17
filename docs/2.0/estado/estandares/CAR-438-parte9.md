# CAR-438 · Limpieza 3, parte 9: exportaciones sin uso en el núcleo de capacidades

- **Sesión:** Sesión Estándares (pasada semanal del 16-nov-2026)
- **PR:** este PR (rama `fix/car-438-exportaciones-nucleo`)
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

18 exportaciones sin uso en `packages/capabilities/src` (núcleo y raíz del paquete), medidas sobre `main` `886e262`:

- 8 dejan de exportarse porque solo se usan en su archivo: `claveDePlataforma` (`contexto.ts`), `AccionNavegacion` (`module.ts`) y en Slack `TIPO_MENSAJE_DIRECTO`, `CANAL_SLACK_DM`, `TIPO_VINCULAR`, `PORTALES_INTERNOS`, `decidir` y `MotivoSinVinculo`.
- 8 reexportaciones muertas salen: `platformIndicadoresPropuestas` y `platformIndicadoresResolver` en `core/remuneraciones/index.ts` (se registran desde el mismo índice), `asegurarBuzon`, `direccionDelBuzon`, `registrarSaliente` y `Saliente` en `core/correos/index.ts` (todos importan del archivo original), y los tipos `Exclusiones` y `Lote` en `retencion-reglas.ts`.
- 2 funciones muertas se borran: `consumoDeEjecucion` en `execute-util.ts`, copia antigua de `consumoEjecucion` (`execute-medicion.ts`), que es la que mide hoy cada ejecución en `core.consumos`; y `solicitudPendiente` en `personas-pago-vista.ts`, que nadie llamaba (el campo `solicitudPendiente` de la vista de pago no cambia).

Nada cambia en pantalla, en la API ni en el MCP. Ningún archivo tocado está en un PR abierto de otra sesión.

## Qué queda pendiente

- Lo que queda del núcleo y de las pantallas por área, en la próxima pasada.

## Qué se decidió

- Sin cambio de comportamiento: typecheck de los 26 paquetes, lint de lo tocado y `pnpm test` (773 archivos) en verde.
