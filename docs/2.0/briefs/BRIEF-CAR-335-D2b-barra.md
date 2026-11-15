# BRIEF · CAR-335 D2b · Marco del diseño nuevo (segunda parte): barra superior y menú sin parpadeo

Plan general: `BRIEF-CAR-335-diseno-nuevo.md`. Decisión: ADR-109. Diseño: `docs/2.0/design/export-diseno-nuevo/` (README §3, barra superior). Depende de D2 (PR #603).

## 1. Objetivo
Que la barra superior del diseño nuevo quede como en el prototipo (buscador único al centro y el tema como ícono) y que el menú plegado se pinte plegado desde el primer byte, sin verse abierto un instante.

## 2. Estado actual (verificado)
En D2 el menú plegado se guardaba en `localStorage`: el servidor no lo conoce y al cargar se ve el menú abierto antes de plegarse. La barra de iPad y escritorio pone la búsqueda dentro del grupo de la derecha. Las áreas plegadas del menú dejaban asomar 8 px de su contenido (un punto suelto bajo cada área, visto en las capturas de `preview-e2e` de #603; ocurre también en el clásico).

## 3. Alcance
Entra: cookie `opai_menu` leída por el servidor; buscador al centro con el texto «Busca o pídele algo a OPAI»; botón de tema («Cambiar entre día y noche») en la barra de iPad y escritorio; arreglo del relleno de las áreas plegadas. Queda para D2c: barra inferior del teléfono (Inicio, Agente, Menú, Yo), el tema dentro de «Yo» en teléfono (hoy está en Preferencias) y el fondo propio del menú lateral (`--ds-side`).

## 4. Arquitectura
`portal-layout` lee `opai_menu` solo con el marco nuevo (`menuPlegadoDeLaPeticion`) y lo pasa por `MarcoPortal` a `MarcoNuevo`, que monta `ShellNuevo` con `plegadoInicial`, `onPlegado` (escribe la cookie) y `onTema` (el mismo `alternarTema` de Hilo: guarda `core.preferencias_tema`). `AppBar` separa la caja de búsqueda (`CajaBusqueda`) y marca sus piezas con `data-shell` (`barra`, `titulo`, `buscar`, `acciones`, `grupo`); en la piel nueva `styles.css` las ordena para dejar el buscador al centro. El clásico no cambia de aspecto: el mismo orden y los mismos espacios.

## 5. Archivos
`apps/web/lib/{marco,marco-servidor}.ts`, `app/_components/{portal-layout,marco-portal,marco-nuevo}.tsx`; `packages/ds/src/shell/{top-bar,caja-busqueda,area-grupo}.tsx`, `shell/nuevo/{shell-nuevo,botones-menu}.tsx`, `styles.css`; pruebas, novedad y `ESTADO.md`.

## 6. Modelo de datos y migraciones
Ninguno.

## 7. Capacidades
Ninguna nueva. El tema usa `core.config.set`, que ya existe en pantalla, API y MCP.

## 8. Interfaz y responsive
Escritorio (≥1024 px): ruta a la izquierda, buscador al centro, acciones de la página, tema, agente y campana a la derecha. iPad: mismo orden, sin centrar (no alcanza el ancho). Teléfono: sin cambios en esta parte.

## 9. Seguridad y tenant
La cookie no es un permiso: solo decide si el menú de esa persona aparece plegado. El tema se guarda como preferencia propia.

## 10. Casos límite
Cookie con un valor desconocido: menú abierto. Marco clásico o Hilo: la cookie ni se lee. Página con acciones en la barra: el buscador queda un poco a la izquierda del centro para no tapar nada.

## 11. Plan por bloques
D2b.1 barra superior, tema y relleno del acordeón. D2b.2 menú plegado por cookie. D2b.3 pruebas, novedad y documentos.

## 12. Tests
Unitarias: cookie del menú (`marco-menu.test.ts`), `ShellNuevo` (plegado inicial, buscador, tema, marcas de la barra) y área plegada sin relleno. `@preview`: el botón de tema se ve en iPad y escritorio, y tras recargar con el menú oculto el HTML del servidor ya trae `data-menu="plegado"`.

## 13. Validación
Gate de los paquetes tocados, presupuesto de JS y `preview-e2e` con capturas revisadas contra el prototipo.

## 14. Criterios de aceptación
Buscador al centro con el texto del prototipo; tema como ícono; el menú oculto se recuerda sin parpadeo; sin puntos sueltos bajo las áreas plegadas; el clásico se ve igual.

## 15. Riesgos y rollback
Rollback: revertir el PR; la cookie `opai_menu` deja de leerse y el menú vuelve a abrir al cargar.

## 16. Reporte de ejecución
Ver la descripción del PR.
