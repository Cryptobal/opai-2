# BRIEF · CAR-182 PR 3a — «Más» con buscador y «Recientes y fijados», y el lugar del agente

## 1. Objetivo
Que el menú «Más» del teléfono se parezca al diseño aprobado (opción B): un campo de búsqueda visible arriba y una fila de cuatro accesos rápidos antes de las áreas. Y dejar el lugar del icono del agente en la barra superior (D11) sin mostrar un botón que todavía no hace nada.

## 2. Estado actual (verificado)
- `contenido-mas.tsx` (PR 2) muestra la lista de Fijados y las áreas en cuadrícula, pero sin buscador: buscar exige el icono de la barra superior.
- Los recientes ya existen en el navegador (`opai_recientes_<época>`, `use-recientes.ts`) y los usa la paleta ⌘K; «Más» no los muestra.
- La barra superior (`TopBarTelefono`, `AppBar`) no tiene lugar para el agente; ADR-049 no está construido.

## 3. Alcance
Entra: campo «Buscar módulos, personas, documentos…» (abre la misma búsqueda global); fila «Recientes y fijados» con hasta 4 baldosas (fijados primero, luego recientes, sin repetir); el slot `agente` en las dos barras, a la izquierda de la campana.
No entra: el agente mismo ni su panel (ADR-049); desfijar desde «Más» (se hace desde la barra lateral, la ficha y Preferencias); indicadores de Inicio (PR 3b); explorador de Documentos (PR 4).

## 4. Arquitectura
Solo `@opai/ds` más una isla en `apps/web`. `mas-acceso.tsx` (nuevo) trae `BuscadorMas`, `RecientesMas` y `baldosasDeAcceso`. `AppShell` recibe `recientes?: () => ItemFijado[]` y lo pasa a `BottomNav` → `MenuMas` → `ContenidoMas`, que lo lee al abrir (no en cada render). `use-recientes-mas.ts` (apps/web) lee `localStorage` y toma el icono de la navegación. `agente?: ReactNode` en `ComunesBarra`.

## 5. Archivos
`packages/ds/src/shell/`: `mas-acceso.tsx`, `contenido-mas.tsx`, `menu-mas.tsx`, `nav.tsx`, `app-shell.tsx`, `top-bar.tsx` y sus tests. `apps/web/app/_components/`: `use-recientes-mas.ts`, `marco-shell.tsx`. `apps/web/e2e/navegacion-areas.spec.ts` (el texto «Fijados» pasa a «Recientes y fijados»).

## 6. Modelo de datos y migraciones
Ninguna.

## 7. Capacidades
Ninguna. Es presentación: la búsqueda abre la paleta existente y los recientes viven en el navegador; la paridad con el MCP no cambia.

## 8. Interfaz y responsive
Teléfono (375 px): campo de 44 px, fila de 4 baldosas de 80 px (icono en ficha de acento y nombre a dos líneas) y debajo las áreas. Sin fijados ni recientes, una línea de ayuda. Si fallan los fijados, aviso con «Reintentar». iPad y desktop no cambian. El slot `agente` queda vacío hasta ADR-049.

## 9. Seguridad y tenant
Los recientes son del navegador, por usuario y empresa (`epoca`), sin servidor. Se validan al leer (ruta relativa, largo máximo). Sin acceso a datos de negocio.

## 10. Casos límite
Sin almacenamiento (modo privado): la fila muestra solo fijados o la ayuda. Un fijado que también es reciente: una sola baldosa. Más de 4 entre ambos: se corta en 4. Reciente que no es entrada del menú: icono de reloj.

## 11. Plan por bloques
1. `ds:` buscador y fila «Recientes y fijados» en «Más». 2. `ds:` slot `agente` en las barras. 3. `docs:` brief, `ESTADO.md`, `NAVEGACION.md`.

## 12. Tests
`mas-acceso.test.ts` (orden, duplicados, tope de 4, vacío, error); `top-bar.test.ts` (el agente va antes de la campana y sin agente no hay botón). Se ajusta el e2e de navegación del teléfono.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test`; revisar a 375 y 1280 px en el preview.

## 14. Criterios de aceptación
El campo abre la búsqueda y cierra «Más». La fila muestra fijados y recientes sin repetir, máximo 4. Sin agente no aparece ningún botón nuevo. Los e2e de navegación pasan.

## 15. Riesgos y rollback
Riesgo bajo, solo presentación. Rollback: revertir el PR. Quien fija o desfija desde el teléfono lo hace ahora fuera de «Más».

## 16. Reporte de ejecución
(se completa al integrar)
