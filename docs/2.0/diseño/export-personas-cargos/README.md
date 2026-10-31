# Export de Personas y Cargos — DS 2.0 (referencia visual aprobada, mockup v1)

**Qué es:** mockup v1 del módulo Personas y Cargos, construido en Claude Design con el Design System de OPAI 2.0 v2 (`44e4d7b9-7464-4771-bff8-07fcff4d573d`), el mismo DS que `export-crm/`, `export-puestos/` y `export-rondas/`. Cubre Personas (lista, ficha, vencimientos), Cargos como catálogo sin montos, y Configuración › Módulos › Personas.

**Versión:** v1. **Revisado:** por el operador el 30-oct-2026 ~13:55 CLT, revisión estática (sin render) contra el prompt de origen, que vive en `alcance/` del computador del operador, fuera de este repositorio.

## Pantallas

- `01 Lista de Personas.dc.html`
- `02 Ficha de persona.dc.html`
- `03 Vencimientos y ficha 375.dc.html`
- `04 P1 No recontratar.dc.html` — propuesta; decide Carlos.
- `05 Cargos.dc.html`
- `06 Ficha del cargo.dc.html`
- `07 Config Personas.dc.html`

Fuentes de las pantallas numeradas: `Personas.dc.html`, `Cargos.dc.html`, `Config Personas.dc.html` y el tablero `Personas y Cargos.dc.html`.

## Decisiones de Carlos

- **D-A:** menú «Cargos» propio (no una pestaña dentro de Personas).
- **D-B:** botón Nuevo flotante abajo a la derecha en 375.
- **D-C:** montos por instalación en solo lectura, según permiso y sueldo sensible.
- **D-D:** entrada en Configuración › Módulos › Personas.
- **D-E:** cambio de banco queda pendiente hasta validación de RRHH.

## Pendientes para la próxima vuelta

- P1 «No recontratar» sigue como propuesta (pantalla 04); no se construye hasta que Carlos la apruebe.
- (resuelto 30-oct-2026) Se reemplazó el nombre real en los textos de los estados Forbidden (`Personas.dc.html`, `Cargos.dc.html`, `Config Personas.dc.html`) por uno ficticio.
- Falta una Hoja de componentes propia del módulo.

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado en 375, 1024 y 1280 px.

## Archivos

- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.
- `_ds/` — el mismo DS 2.0 v2 que usan los demás exports de este directorio.

No se copiaron `uploads/`, miniaturas ni capturas: no corresponden al diseño aprobado.
