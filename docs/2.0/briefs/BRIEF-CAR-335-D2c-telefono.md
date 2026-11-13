# BRIEF · CAR-335 D2c · Marco del diseño nuevo (tercera parte): teléfono y fondo del menú

Plan general: `BRIEF-CAR-335-diseno-nuevo.md`. Decisión: ADR-109. Diseño: `docs/2.0/design/export-diseno-nuevo/Telefono.dc.html` (pestañas `tel.tabs`) y `Escritorio.dc.html` (color `side`). Depende de D2b (PR #607).

## 1. Objetivo
Cerrar el marco del diseño nuevo: en teléfono, barra inferior con Inicio, Agente, Menú y Yo (la cuenta y el tema viven en «Yo»); en iPad y escritorio, el menú lateral y el riel con su fondo propio.

## 2. Estado actual (verificado)
Con la piel nueva, el teléfono seguía con la barra inferior clásica (Inicio, Pauta, Personas, Bandeja, Más) y el avatar arriba. El menú lateral usaba `--ds-surface` (blanco de día), sin el gris `#fafafa` del prototipo.

## 3. Alcance
Entra: `BarraInferiorNueva` (solo dentro de `ShellNuevo`), pestaña «Agente» que abre el mismo panel del agente (evento `opai:agente`), «Yo» con «Cambiar entre día y noche» más el menú de cuenta, token `--ds-side` (día `#fafafa`, noche `#0a0a0a`) para el menú y el riel. Queda fuera: la vista «Tu cuenta» a pantalla completa del prototipo (por ahora «Yo» abre el menú de cuenta de siempre) y quitar el botón del agente de la barra superior del teléfono.

## 4. Arquitectura
`ShellNuevo` monta `BarraInferiorNueva` después de `AppShell`. La barra clásica (`data-shell="inferior"`) y el avatar de arriba (`data-shell="usuario"`) se esconden con la piel en `styles.css`, sin JS en el shell compartido. «Menú» reutiliza `MenuMas` (todas las áreas, fijados, recientes y búsqueda). `MarcoNuevo` pasa `onAgente` solo si el agente está disponible (`datos.agente`).

## 5. Archivos
`packages/ds/src/shell/nuevo/{barra-inferior,shell-nuevo}.tsx`, `shell/{nav,top-bar}.tsx` (marcas `data-shell`), `tokens.css`, `styles.css`; `apps/web/app/_components/marco-nuevo.tsx`; pruebas, novedad y `ESTADO.md`.

## 6. Modelo de datos y migraciones
Ninguno.

## 7. Capacidades
Ninguna nueva. El agente y el tema usan lo existente.

## 8. Interfaz y responsive
Teléfono: cuatro pestañas de 56 px más safe-area; activa en negrita con el ícono en el acento. «Menú» queda activa fuera de Inicio. iPad y escritorio: menú y riel en `--ds-side`.

## 9. Seguridad y tenant
Sin agente (licencia o permiso) no hay pestaña «Agente». «Yo» muestra los mismos ítems de cuenta de hoy.

## 10. Casos límite
Sin usuario o sin ítems de cuenta: sin «Yo». Portal sin «/» en la navegación: Inicio toma el primer ítem.

## 11. Plan por bloques
D2c.1 barra inferior y fondo del menú. D2c.2 pruebas, novedad y documentos.

## 12. Tests
Unitarias en `shell-nuevo.test.tsx` (pestañas, Agente condicionado, barra clásica marcada). `@preview`: en teléfono la barra trae «Menú» y «Yo».

## 13. Validación
Gate de los paquetes tocados, presupuesto de JS y `preview-e2e` con capturas revisadas contra el prototipo.

## 14. Criterios de aceptación
Teléfono con Inicio, Agente, Menú y Yo; el tema se cambia desde «Yo»; menú lateral con fondo propio; el clásico no cambia.

## 15. Riesgos y rollback
Rollback: revertir el PR; el diseño nuevo vuelve a la barra inferior clásica.

## 16. Reporte de ejecución
Ver la descripción del PR.
