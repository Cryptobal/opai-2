# BRIEF · CAR-182 PR 2 — Menú visual (barra lateral y «Más»)

## 1. Objetivo
Que se note en qué área y en qué página se está, y que el menú del teléfono se use con el dedo. Carlos, 3-nov-2026: «cuando paso en desktop sobre otros menús no sé en cuál estoy, está muy plano», «Firmas sigue suelta, no en Documentos» y «no se ve bien en móvil». Elegió la opción B (cuadrícula) para «Más».

## 2. Estado actual (verificado)
- `packages/ds/src/shell/sidebar.tsx` pintaba el título del área como texto plano y mostraba suelta toda área con una sola entrada (Firmas).
- `AreaGrupo` (encabezado con icono y chevron) y `EntradaArea` (guía vertical y barra de acento en la activa), previstos en `NAVEGACION.md` §8.2.1 y §8.2.2, existían pero la barra lateral no los usaba.
- `contenido-mas.tsx` listaba las entradas en filas planas.

## 3. Alcance
Entra: encabezado de área con icono; área activa marcada aunque esté plegada; entradas con guía y barra de acento; áreas con una sola entrada con su encabezado; «Más» en cuadrícula de 3 columnas por área.
No entra (PR 3): indicadores de Inicio, `core.inicio.*`, icono del agente. No entra (PR 4): explorador de Documentos.

## 4. Arquitectura
Solo `@opai/ds`. `sidebar-grupos.tsx` renderiza cada grupo (archivo aparte por el tope de 150 líneas); `area-iconos.ts` asigna un icono a cada área de `AREAS_NAV`; `AreaGrupo` recibe `activa`. Sin cambios en los manifests ni en la navegación por permisos.

## 5. Archivos
`area-iconos.ts` (nuevo), `sidebar-grupos.tsx` (nuevo), `sidebar.tsx`, `area-grupo.tsx`, `contenido-mas.tsx`, `sidebar.test.ts`.

## 6. Modelo de datos y migraciones
Ninguna.

## 7. Capacidades
Ninguna. No cambia ninguna acción de pantalla; la paridad con el MCP no se ve afectada.

## 8. Interfaz y responsive
Escritorio e iPad (≥1024 px): acordeón con el área de la ruta abierta; plegada, su encabezado va con fondo y texto fuerte; la entrada activa, con barra de acento. Teléfono: «Más» con baldosas de 88 px (≥44 px de toque), la de la página actual con borde y ficha de acento. Los nombres accesibles no cambian (`button` del área, `link` de cada entrada).

## 9. Seguridad y tenant
Sin acceso a datos. El menú sigue armándose desde los manifests y los permisos.

## 10. Casos límite
Área con una entrada (Documentos › Firmas); portales sin acordeón (siguen planos); áreas desconocidas (icono de carpeta); preferencia «Según mi rol» que pliega el área.

## 11. Plan por bloques
1. `ds:` barra lateral con encabezados, guía y activa. 2. `ds:` «Más» en cuadrícula. 3. `docs:` brief, `ESTADO.md` y `NAVEGACION.md`.

## 12. Tests
`sidebar.test.ts`: área con una sola entrada con encabezado, `aria-expanded` y área activa marcada. Se mantienen los tests de navegación y los e2e de menú.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test`; capturas a 375, 1024 y 1280 px en la vista previa.

## 14. Criterios de aceptación
- [ ] Firmas aparece dentro de «Documentos», con su encabezado.
- [ ] Cada área tiene icono y chevron; la de la página actual se distingue aunque esté plegada.
- [ ] La entrada activa lleva barra de acento.
- [ ] «Más» en el teléfono es una cuadrícula por área; la página actual se distingue.
- [ ] Sin cambios de URL, permisos ni capacidades.

## 15. Riesgos y rollback
Bajo: solo presentación. Revertir el squash.

## 16. Reporte de ejecución
Se completa en el PR.
