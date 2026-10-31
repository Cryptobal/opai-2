# Export de Reportería DT — DS 2.0 (referencia visual, mockup v1)

**Qué es:** mockup v1 de Asistencia · Reportería DT (reportes y verificación para la Dirección del Trabajo, Res. Exenta 38), construido en Claude Design con el Design System de OPAI 2.0.

**Versión:** v1. **Revisado:** por el operador el 30-oct-2026 ~14:40 CLT (revisión estática, sin render), contra el prompt de origen en `alcance/` del computador del operador (no en este repositorio).

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado.

## Archivos

- `Indice.dc.html` — índice de las pantallas del export.
- `01 Reportes DT.dc.html` — listado y generación de reportes DT.
- `02 Reporte de asistencia.dc.html` — reporte de asistencia.
- `03 Verificar por hash.dc.html` — verificación pública de una marca por su hash.
- `04 Correcciones y oposicion.dc.html` — correcciones de marcas y oposición.
- `05 Contingencia e incidentes.dc.html` — registro de contingencias e incidentes.
- `06 Portal de fiscalizacion.dc.html` — portal para el fiscalizador de la DT.
- `07 Auditoria fiscalizador.dc.html` — auditoría de lo que vio el fiscalizador.
- `08 Accesos de mandante.dc.html` — administración de accesos de mandante.
- `09 Respaldos y retencion.dc.html` — respaldos y política de retención.
- `10 Checklist certificacion.dc.html` — checklist de certificación.
- `Hoja de componentes.dc.html` — componentes del DS usados en este mockup.
- `P01-Reportes.dc.html` … `P10-Certificacion.dc.html`, `Verificador-Hash.dc.html` y `Hoja-Panel.dc.html` — componentes fuente que importan las pantallas anteriores (uno por pantalla, más el verificador de hash y el panel de ejemplos).
- `adt.js` — datos de ejemplo, navegación y configuración compartidos entre las pantallas de este mockup.
- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.
- `_ds/` — el Design System 2.0 que cargan los `.dc.html` (tokens, componentes, fuentes).

Cada pantalla trae 375/1024/1280 px, claro/oscuro, los estados vacío, cargando, error y sin permiso, y su variante B «Propuesta, a confirmar por Carlos».

## Decisiones abiertas (de Carlos)

- Las siglas usadas en los reportes.
- El checklist de certificación de muestra.
- Si el `Sheet` se usa en el teléfono.
- Las metas de rendimiento.
- La razón social del titular ante la DT sigue «por confirmar».

## Pendientes menores

- Quitar «Carlos Irigoyen» como actor de ejemplo (en `05 Contingencia e incidentes.dc.html` y `08 Accesos de mandante.dc.html`, entre otras pantallas), de los textos de estado «sin permiso» y del bundle `_ds/`.
- El `Indice.dc.html` dice «Asistencia DT v1»; alinear el nombre con «Reportería DT».
- Hex sueltos en los envoltorios de varias pantallas (`#d4d4d8`, `#18181b`, `#52525b`, `#3f3f46`), fuera de `_ds/tokens/`.
