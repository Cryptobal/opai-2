# Export de ARCO — DS 2.0 (referencia visual, mockup v2)

**Qué es:** mockup v2 del módulo de Cumplimiento (Configuración › Cumplimiento): solicitudes ARCO, incidentes y brechas, RAT, retención y anonimización, Ley 21.719. Construido en Claude Design con el Design System de OPAI 2.0 v2 (`44e4d7b9-7464-4771-bff8-07fcff4d573d`).

**Revisión:** revisado por el operador el 30-oct-2026 ~13:55 CLT (revisión estática, sin render), contra el prompt de origen en `alcance/` del computador del operador (no está en este repo).

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado.

## Pantallas

- `00 Indice.dc.html` — índice del módulo.
- `01 Resumen.dc.html` — resumen de Cumplimiento.
- `02 Bandeja de solicitudes.dc.html` — bandeja de solicitudes ARCO.
- `03 Detalle de solicitud.dc.html` — detalle de una solicitud, con los dialogs Prorrogar y Denegar.
- `04 Responder.dc.html` — responder una solicitud.
- `05 Registrar solicitud.dc.html` — registrar una solicitud nueva.
- `06 Incidentes y brechas.dc.html` — incidentes y brechas de datos.
- `07 RAT.dc.html` — Registro de Actividades de Tratamiento.
- `08 Retencion y anonimizacion.dc.html` — retención y anonimización.
- `09 Privacidad en la ficha.dc.html` — privacidad dentro de la ficha de la persona.
- `10 Hoja de componentes.dc.html` — hoja de componentes del módulo.
- `B1 Bloqueo temporal.dc.html`, `B2 Plazo de aviso de brechas.dc.html`, `B3 Formulario publico.dc.html` — **Propuesta B, a confirmar por Carlos**; los plazos quedan por validar con el Abogado.
- `Artboards.dc.html` y `Cumplimiento ARCO.dc.html` son los componentes fuente de las pantallas anteriores (vía `<dc-import>`), no pantallas independientes.
- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.
- `_ds/` — DS 2.0 v2 (bundle, tokens, fuentes) que cargan los `.dc.html` para verse con estilos; no se consume desde la app.

## Pendientes para la próxima vuelta

- Las fechas de ejemplo en dic-2026 conviene pasarlas a nov-2026.
