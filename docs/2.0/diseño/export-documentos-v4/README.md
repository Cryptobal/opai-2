# Export documentos v4 (Claude Design)

Diseño del módulo **Documentos**: explorador, subir documento, vista del documento, vencimientos de cuentas e instalaciones, plantillas, editor global de plantillas, generar documento desde plantilla (con lote), firmas pendientes, importar Word o PDF y Configuración › Módulos › Documentos. Versión v4.

Aprobado por Carlos el 30-10-2026 (decisiones B1–B5 y fecha ADR-019 citadas en `Índice.dc.html` del propio export).

Las pantallas (`.dc.html`) referencian el DS **«OPAI 2.0 Design System V2»**; el paquete del DS (`_ds/`) y los prompts de origen (`uploads/`) no se copian a este export porque traen datos reales del computador del operador.

## Pantallas

- `Índice.dc.html`
- `01 Explorador.dc.html`
- `02 Subir documento.dc.html`
- `03 Vista del documento.dc.html`
- `04 Vencimientos.dc.html`
- `05 Plantillas.dc.html`
- `06 Editor de plantillas.dc.html`
- `07 Generar documento.dc.html`
- `08 Firmas pendientes.dc.html`
- `09 Importar Word o PDF.dc.html`
- `10 Configuracion Modulos Documentos.dc.html`
- `Hoja de componentes.dc.html`

`Explorador.dc.html`, `SubirDocumento.dc.html`, `VistaDocumento.dc.html`, `Vencimientos.dc.html`, `Plantillas.dc.html`, `EditorPlantilla.dc.html`, `GenerarDocumento.dc.html`, `FirmasPendientes.dc.html`, `ImportarPlantilla.dc.html`, `TiposDocumento.dc.html` y `ComponentesPanel.dc.html` son los componentes fuente (cada uno con su lógica y sus variantes) que los archivos numerados y `Hoja de componentes.dc.html` importan para armar el storyboard de cada pantalla; no son pantallas aparte y `Índice.dc.html` no enlaza a ellos directamente.

## Decisiones (citadas de `Índice.dc.html` y `10 Configuracion Modulos Documentos.dc.html`)

- Tipos de documento vive en `/configuracion/modulo/documentos` (pantalla 10).
- Entra **B2** (avisos a 30 y 60 días por defecto, en las pantallas 04 y 10).
- Entra **B3** (contratos en lote, en la pantalla 07).
- Se descartan **B1** (carpetas manuales en 01 Explorador), **B4** (lectura OCR de la fecha de vencimiento en 02) y **B5** (plantillas de correo en el editor global, en 06).

## Pendientes para la construcción

1. **Forbidden sin nombre propio.** El export fuente usaba, en los 10 componentes con `Forbidden`, un texto que nombraba a la administradora ficticia de ejemplo usada en otros exports ya en `main` (por ejemplo `export-tickets-v3`), con la fórmula «Pídele acceso a [nombre], administradora de Atlas Seguridad SpA.». Este export ya lo corrige a «Pídele acceso a un administrador.»; en la construcción no volver a hardcodear el nombre de una persona en el mensaje de sin-permiso.
2. **Chips de variable con estilo a mano.** Las 22 ocurrencias de `font:500 12px` escritas a mano en `ComponentesPanel`, `EditorPlantilla`, `GenerarDocumento` e `ImportarPlantilla` (la pastilla de variable `{persona.rut}`, `{sueldo.base}`, etc., y el botón de variable del editor) ya se corrigieron en el export a las clases del DS V2 `t-overline` + `t-mono` (13 px/20 px, en vez del tamaño 12/18 inventado a mano). Falta formalizar **ChipVariable** como componente propio del DS (ya marcado «Nuevo» en `Hoja de componentes.dc.html`) en vez de dejar la combinación de clases suelta en cada pantalla.

## Nota de implementación (decisión de este export, no de Carlos)

Para que ese nombre de ejemplo del punto anterior no quedara en ningún archivo del export (punto exigido por el propio encargo de esta tarea, que verifica con `rg` que el directorio quede sin ese nombre), además del mensaje de `Forbidden` se reemplazó donde aparecía como dato de muestra (usuario con sesión activa en `AppShell`, «Subido por», «Última edición» y el historial de versiones) por el nombre ficticio **Paula Ibáñez** (iniciales `PI`). No afecta ninguna decisión de alcance ni de diseño: es solo el dato de muestra del administrador que sube o edita documentos en las capturas.
