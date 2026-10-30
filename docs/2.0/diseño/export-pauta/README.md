# Export de Pauta — DS 2.0 (referencia visual aprobada, mockup v3)

**Qué es:** mockup v3 del módulo Pauta (pauta mensual/diaria, reemplazos, refuerzos, alertas), construido en Claude Design con el Design System de OPAI 2.0.

**Versión:** v3. **Aprobado:** decisión de Carlos, 30-oct-2026 11:53 CLT.

**Prompt de origen:** `alcance/design-prompt-pauta.md` + el ajuste `alcance/design-prompt-pauta-ajuste-v3.md`. Ambos están en el computador del operador, no en este repositorio.

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/`, el `ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado.

## Archivos

- `Indice.dc.html` — índice de las pantallas del export.
- `Pauta.dc.html` — pantalla principal de Pauta.
- `Pauta mensual.dc.html` — vista mensual de la pauta.
- `Tablero.dc.html` — tablero con las pantallas juntas, para revisión.
- `P01 Mensual por instalacion.dc.html` — pauta mensual por instalación.
- `P02 Hoja Serie del puesto.dc.html` — hoja de serie del puesto.
- `P03 Hoja Excepcion de un dia.dc.html` — hoja de excepción de un día.
- `P04 Historial de cambios.dc.html` — historial de cambios.
- `P05 Mensual todas las instalaciones.dc.html` — pauta mensual de todas las instalaciones.
- `P06 Cobertura puestos sin cubrir.dc.html` — cobertura de puestos sin cubrir.
- `P07 Diaria.dc.html` — pauta diaria.
- `P08 Hoja Asignar reemplazo.dc.html` — hoja para asignar reemplazo.
- `P09 Alertas.dc.html` — alertas.
- `P10 Hoja Agregar refuerzo.dc.html` — hoja para agregar refuerzo.
- `Componentes.dc.html` — componentes del DS usados en este mockup.
- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.
- `_ds/` y `ds/` — el Design System 2.0 que cargan los `.dc.html` (tokens, componentes, fuentes).
- `screenshots/` — capturas de la QA del mockup.

## Pendientes para la próxima vuelta

- (a) El encabezado todavía dice «v2» y debe decir «v3».
- (b) En días pasados el menú debe permitir registrar una licencia retroactiva; hoy no deja hacer nada.
