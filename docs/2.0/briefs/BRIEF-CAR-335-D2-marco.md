# BRIEF · CAR-335 D2 · Marco del diseño nuevo (primera parte)

Plan general: `BRIEF-CAR-335-diseno-nuevo.md`. Decisión: ADR-109. Diseño: `docs/2.0/design/export-diseno-nuevo/`. Depende de D1 (piel y `acentoDeMarca`).

## 1. Objetivo
Que el diseño nuevo se pueda **probar en la aplicación real**: se elige en Preferencias, se pinta con su piel y con el color de la empresa, y el menú lateral se oculta y se asoma al pasar el mouse, como pidió Carlos el 12-nov.

## 2. Estado actual (verificado)
El marco se elige por cookie (`opai_marco`) y por el ajuste `core.preferencias_marco` (clásico o Hilo). El shell clásico ya trae menú lateral con áreas en acordeón, riel de íconos en iPad y Configuración al pie, que es la estructura del diseño nuevo.

## 3. Alcance
Entra: valor «nuevo» del marco, opción «Nuevo (vista previa)» en Preferencias y en el atajo del menú, shell nuevo (mismo shell del clásico con la piel nueva), menú plegable con «asomarse», color de la empresa como acento, muestra `/ds/nuevo/marco`, pruebas y novedad. Queda para la segunda parte del marco: barra superior con buscador al centro y tema como ícono, barra inferior del teléfono (Inicio, Agente, Menú, Yo) y el fondo propio del menú lateral.

## 4. Arquitectura
`MarcoPortal` recibe el marco resuelto. «nuevo» monta `MarcoShell` con `nuevo`, que pasa a `AppShell`; `AppShell` delega en `ShellNuevo` (cliente). Este envuelve el shell en `data-marco="nuevo"`, copia el atributo a `<html>` para menús y diálogos, guarda en este navegador si el menú queda plegado y controla el menú asomado. `Sidebar` y `Rail` aceptan un estado `plegable`. El acento lo pinta `useAcentoEmpresa` (lee `core.marca.get`, ajusta con `acentoDeMarca` y repinta al cambiar el tema).

## 5. Archivos
`apps/web/lib/marco.ts`, `portal-layout.tsx`, `marco-portal.tsx`, `marco-shell.tsx`, `menu-cuenta-shell.ts`, `acento-empresa.ts`, `mi-cuenta/preferencias/diseno-form.tsx`, `ds/nuevo/marco/*`; `packages/ds/src/shell/{app-shell,sidebar,rail}.tsx`, `shell/nuevo/shell-nuevo.tsx`; `packages/capabilities/src/core/config/nucleo.ts`; pruebas y novedad.

## 6. Modelo de datos y migraciones
Ninguno. «nuevo» es un valor más del ajuste existente (ADR-038, sin migración).

## 7. Capacidades
Ninguna nueva. Usa `core.config.set` (preferencia) y `core.marca.get` (color), que ya existen en pantalla, API y MCP.

## 8. Interfaz y responsive
Escritorio: menú de 248 px con botón «Ocultar el menú»; oculto, queda el riel de íconos con «Dejar el menú fijo», y al pasar el mouse el menú completo flota sobre la página hasta que el mouse se aleja o se elige una pantalla. iPad: riel, y el menú se asoma con mouse o trackpad. Teléfono: sin cambios de estructura en esta parte.

## 9. Seguridad y tenant
El color se lee con el permiso de lectura de la empresa y de la empresa de la sesión; sin permiso o sin color queda el acento por defecto. La preferencia es por persona. La cookie no es un permiso.

## 10. Casos límite
Sin almacenamiento local: el menú vuelve a su estado por defecto. Menú asomado sin mover el mouse: se cierra al alejarse más allá de su ancho. Cambio de tema con el menú abierto: se repinta el acento. Fuera del ERP o sin acceso: clásico, como Hilo.

## 11. Plan por bloques
D2.1 marco elegible, shell nuevo, menú plegable y color. D2.2 pruebas `@preview`, muestra y novedad. D2.3 documentos.

## 12. Tests
Unitarias del marco (cookie, resolución y atajo); pruebas del DS sin cambios; e2e de `/ds/nuevo/marco` (ocultar, asomar, fijar y recordar); `@preview` con `qa-e2e`: elegir el diseño, HTML del servidor con la piel, Geist, ocultar y asomar el menú, y volver al clásico.

## 13. Validación
Gate de los paquetes tocados, e2e local de la muestra a 375, 1024 y 1280 px, y `preview-e2e` con capturas revisadas contra el prototipo.

## 14. Criterios de aceptación
Se puede elegir y volver; el servidor pinta la piel sin parpadeo; el menú se oculta, se asoma y se recuerda; el acento usa el color de la empresa; el clásico y Hilo no cambian.

## 15. Riesgos y rollback
Cambia el texto del atajo del menú para quienes usan el clásico («Probar el diseño nuevo» en vez de Hilo). Rollback: revertir el PR; quien tenga la cookie «nuevo» vuelve al clásico, porque un valor desconocido se lee como clásico.

## 16. Reporte de ejecución
La prueba con sesión no se pudo correr en local porque esta sesión no llega a la base de datos; corre en `preview-e2e`. La muestra sin sesión se probó en local en los tres tamaños.
