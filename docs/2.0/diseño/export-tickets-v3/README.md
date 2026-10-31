# Export tickets v3 (Claude Design)

Diseño del módulo **Tickets** (CAR-84 · Ola 3): bandeja, ficha, solicitudes con aprobación, nuevo ticket, portal del supervisor, configuración de tipos y resumen diario por correo. Versión v3.

Aprobado por Carlos el 30-oct-2026 a las 21:19 CLT.

Reemplaza a `#157` (export tickets v2, carpeta `export-tickets`, rama `docs/diseno-tickets`), que no se toca y queda en su propia carpeta.

Las pantallas (`.dc.html`) referencian el DS **«OPAI 2.0 Design System V2»**; el paquete del DS (`_ds/`) y los prompts de origen (`uploads/`) no se copian a este export porque traen datos reales del computador del operador.

## Pantallas

- `Indice.dc.html`
- `1 Bandeja de tickets.dc.html`
- `2 Ficha del ticket.dc.html`
- `3 Solicitud con aprobacion.dc.html`
- `4 Nuevo ticket.dc.html`
- `5 Lista del supervisor.dc.html`
- `6 Configuracion modulo Tickets.dc.html`
- `7 Estados especiales.dc.html`
- `8 Resumen diario.dc.html`
- `Componentes.dc.html` (Hoja de componentes)

`Bandeja.dc.html`, `Tipos.dc.html`, `NuevoTicket.dc.html`, `Supervisor.dc.html`, `Ficha.dc.html` y `ResumenDiario.dc.html` son los componentes fuente (cada uno con su lógica y sus variantes) que los archivos numerados importan para armar el storyboard de esa pantalla; no son pantallas aparte y `Indice.dc.html` no enlaza a ellos directamente.

## Pendientes para la construcción

Ninguno (aprobado tal cual).
