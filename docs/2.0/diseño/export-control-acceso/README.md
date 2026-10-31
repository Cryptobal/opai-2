# Export control-acceso v1 (Claude Design)

Diseño en Claude Design del módulo **Control de acceso** (portería, listas, prerregistro e invitación con QR). Versión v1.

Aprobado por Carlos el 30-oct-2026 a las 21:19 CLT.

## Pantallas

Según `Indice.dc.html`:

1. `Accesos.dc.html` — ERP
2. `InstalacionAccesos.dc.html` — ERP (Instalación › Accesos)
3. `Listas.dc.html` — ERP
4. `ImportarLista.dc.html` — ERP
5. `Prerregistrar.dc.html` — ERP y Cliente (Prerregistrar visita)
6. `InvitacionQR.dc.html` — Visitante (Invitación con QR)
7. `ConfigAcceso.dc.html` — ERP (Configuración › Control de acceso)
8. `ClienteAccesos.dc.html` — Cliente (Instalación › Accesos)
9. `PorteriaAlineacion.dc.html` — Terreno (Alineación de la portería)
10. `SupervisorPorteria.dc.html` — ERP (Portería del supervisor)
11. `VistaPorRol.dc.html` — Lámina (Vista por rol)
12. `Componentes-acceso.dc.html` — DS (Hoja de componentes)

Componentes de apoyo, usados con `dc-import` desde las pantallas anteriores (no aparecen en el índice):

- `AccesoDetalle.dc.html` — detalle de un registro de acceso, usado por `Accesos` e `InstalacionAccesos`.
- `EstadoPanel.dc.html` — estados de carga, vacío, error y sin permiso, usado por `ImportarLista`, `ClienteAccesos`, `InstalacionAccesos`, `ConfigAcceso` y `SupervisorPorteria`.

`Indice.dc.html` es el índice de navegación entre pantallas (no es parte del flujo de producto).

## DS

Los `.dc.html` referencian el DS OPAI 2.0 V2 (`OPAI20DesignSystem_44e4d7`) a través de `ds-base.js`, que a su vez carga los estilos y el bundle desde `_ds/opai-2-0-design-system-v2-44e4d7b9-.../`. Ese paquete **no se incluye** en este export (ver «Qué no se incluye»), así que las pantallas no renderizan completas de forma aislada; se revisan abiertas desde Claude Design o contra una copia local del paquete del DS.

## Qué no se incluye

- `_ds/` — paquete del DS con datos reales (nombre y RUT reales del operador en textos de ejemplo del bundle).
- `uploads/` — prompt de origen y adjuntos, con datos reales.

Se verificó que ninguno de los `.dc.html`, `support.js` ni `ds-base.js` copiados aquí contiene esos datos reales (una búsqueda del nombre y RUT del operador sobre esta carpeta no devuelve resultados). Los RUT, nombres y empresas que aparecen en las pantallas (Camila Herrera Soto, Diego Fuentes, Atlas Seguridad SpA, Bodegas del Sur S.A., etc.) son datos ficticios de ejemplo.

## Pendientes para la construcción

Ninguno (aprobado tal cual).
