# Export de Flujo de caja — DS 2.0 (referencia visual aprobada, mockup v2)

**Qué es:** mockup v2 del módulo flujo-caja (Finanzas · Flujo de caja; sus ajustes viven en Configuración › Módulos › Finanzas), construido en Claude Design con el Design System de OPAI 2.0.

**Versión:** v2. **Revisado:** por el operador el 30-oct-2026 ~14:40 CLT (revisión estática, sin render) contra el prompt de origen y su ajuste v2 en `alcance/`, ambos en el computador del operador, no en este repositorio.

**Reemplaza a:** #156 (export flujo-caja v1).

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado.

## Archivos

- `Indice.dc.html` — índice de las pantallas del export.
- `01 Planilla del flujo.dc.html` — planilla del flujo de caja.
- `02 Traza de celda.dc.html` — traza de una celda de la planilla.
- `03 Reprogramar.dc.html` — reprogramar un movimiento.
- `04 Alerta con salida.dc.html` — alerta con salida propuesta.
- `05 Flujo en el celular.dc.html` — flujo de caja en el celular.
- `06 Cierre semanal.dc.html` — cierre semanal.
- `07 Filas y ajustes.dc.html` — filas y ajustes (Configuración › Módulos › Finanzas).
- `08 Estados propios.dc.html` — estados propios del módulo.
- `09 Hoja de componentes.dc.html` — hoja de componentes del DS usados en este mockup.
- `10 Variante B.dc.html` — variante B: metas de rendimiento y correo de saldo negativo (aprobada el 30-10-2026).
- `Flujo.dc.html`, `Ajustes.dc.html`, `Componentes.dc.html` — componentes fuente de las pantallas anteriores.
- `flujo.js`, `support.js` — runtime de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.
- `_ds/` — el Design System 2.0 que cargan los `.dc.html` (tokens, componentes, fuentes).

## Centros de costo

Las instalaciones del tenant, más «Administración / Oficina central».

## Pendientes menores para la próxima vuelta

- (resuelto 30-oct-2026) Se reemplazó el nombre real de los datos de ejemplo (textos de sin-permiso, la alerta de correo y el correo de ejemplo en 10) y del bundle `_ds` por uno ficticio.
- Reemplazar los hex sueltos (`#4a3fd8`) por tokens del DS.
- Rotular el Índice como v2.
- En iPad, quitar la pestaña «Ajustes» de las tabs.
- Mostrar la lista de módulos a la izquierda y «‹ Módulos» a 375px.
- Mostrar «Oficina central» en 02 Traza de celda.
- 08 Estados propios solo muestra el estado cargando; 05 Flujo en el celular solo se revisó a 375px.
