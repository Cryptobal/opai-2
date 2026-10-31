# Tickets — export de diseño (Claude Design) · v2

**Módulo:** Tickets internos (ADR-025): sin chat, ticket con dueño, solicitudes con aprobación de un paso, SLA opcional apagado por defecto.
**Versión:** v2, reemplaza al export v1 en este mismo PR.
**Fuente:** proyecto de Claude Design `6a34b682`, export del 30-oct-2026 15:30 CLT.
**Revisado por el operador:** 30-oct-2026 ~15:40 CLT (revisión estática, sin render), contra el prompt de origen y el ajuste v2, ambos en `alcance/` del computador del operador (no en el repo).

## Pantallas

| # | Pantalla | Fuente |
|---|----------|--------|
| 00 | Índice | `Indice.dc.html` |
| 01 | Bandeja de tickets | `Bandeja.dc.html` |
| 02 | Ficha del ticket | `Ficha.dc.html` |
| 03 | Solicitud con aprobación | `NuevoTicket.dc.html` |
| 04 | Nuevo ticket | `NuevoTicket.dc.html` |
| 05 | Lista del supervisor (portal, 375) | `Supervisor.dc.html` |
| 06 | Configuración › Módulos › Tickets › Tipos | `Tipos.dc.html` |
| 07 | Estados especiales | — |
| 08 | Variante B Resumen diario | `ResumenDiario.dc.html` |
| — | Hoja de componentes | `Componentes.dc.html` |

## Corregido respecto del v1

- La configuración de tipos pasó a **Configuración › Módulos › Tickets**.
- La Hoja de componentes ya está dibujada; nuevos para el DS: **«Timeline con nota»** y **«Fila de adjunto»**.
- La variante B **«Resumen diario por correo al dueño»** está dibujada aparte y rotulada «Propuesta, a confirmar por Carlos».

## Decisiones abiertas

- **B · Resumen diario por correo al dueño** — decide Carlos. Si no se aprueba, Configuración › Módulos › Tickets queda sin esa sección.

## Pendientes menores (no bloquean, próxima vuelta)

- **(ALTO)** «Carlos Irigoyen» sigue como dato de ejemplo (dueño, usuario actual, administrador) en Bandeja, Ficha, Componentes, Tipos, NuevoTicket, Supervisor y ResumenDiario, y en el bundle `_ds`: se reemplaza por un nombre inventado.
- Falta la alerta «Decide Carlos» en 1 Bandeja y 6 Tipos que enlace a la variante B.
- En 6 Tipos falta la lista de módulos a la izquierda en 1024/1280 y el paso «‹ Módulos» a 375.
- 7 Estados especiales solo trae oscuro a 375.
- Índice y envoltorios aún dicen «v1».
- `ComponentesPanel.dc.html` está vacío y el envoltorio de Componentes usa `#d4d4d8`.
