# Export configuración v1.1 (Claude Design)

Diseño del **Centro de Configuración** (ADR-018): portada por tarjetas de grupo, buscador de ajustes, subpágina de grupo, grupo Módulos, Agentes con el Agente interno, vista por rol, menú de usuario (con Preferencias) y estados especiales. Versión v1.1.

Aprobado por Carlos el 30-10-2026 a las 21:19 CLT.

Las pantallas (`.dc.html`) referencian el DS **«OPAI 2.0 Design System V2»**; el paquete del DS (`_ds/`) y los prompts de origen (`uploads/`) no se copian a este export porque traen datos reales del computador del operador.

## Pantallas

- `Indice.dc.html`
- `1 Portada.dc.html`
- `2 Buscador.dc.html`
- `3 Grupo Operacion Calendario.dc.html`
- `4 Grupo Modulos.dc.html`
- `5 Agentes.dc.html`
- `6 Variante B1 Documentos en Modulos.dc.html` (propuesta, a confirmar por Carlos)
- `7 Vista por rol.dc.html`
- `8 Menu de usuario.dc.html`
- `9 Estados especiales.dc.html`
- `Hoja de componentes.dc.html`

`ConfigScreen.dc.html`, `Lamina.dc.html`, `TarjetaGrupo.dc.html` y `ResultadoAjuste.dc.html` son los componentes fuente (lógica y estados) que los archivos numerados importan para armar el storyboard de cada pantalla; no son pantallas aparte y `Indice.dc.html` no enlaza a ellos directamente.

## Pendientes para la construcción

1. El nombre real del usuario de ejemplo de `ConfigScreen.dc.html` (usuario de ejemplo del rol Administrador) pasa a un nombre ficticio: ya corregido en este export a «Ignacio Soto» (initials «IS», correo `ignacio.soto@atlasseguridad.cl`), siguiendo el resto de datos de ejemplo ficticios del archivo (Atlas Seguridad SpA, Paola Contreras, Jorge Muñoz, Andrea Rojas).
