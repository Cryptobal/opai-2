# Export finanzas-ventas-banca v3

Diseño en Claude Design de **Finanzas**: Hoy en Finanzas, Ventas (DTE), Programación y cierre de mes, Landing /cobro/[token], Cobranza, Banca, Factoring, Integraciones de Finanzas y Configuración › Módulos › Finanzas › DTE, más el flujo de caja semanal y la hoja de componentes.

Aprobado por Carlos el 30-10-2026 a las 21:19 CLT.

Los `.dc.html` referencian el Design System de OPAI 2.0 V2 (hojas de `_ds/opai-2-0-design-system-v2-44e4d7b9-7464-4771-bff8-07fcff4d573d/`). Ese paquete del DS y la carpeta `uploads/` (con el prompt de origen) no se copiaron a este export porque traen datos reales; quedan en el origen del diseño.

## Pantallas

- `Pantalla 1 Hoy en Finanzas Artboards.dc.html`
- `Pantalla 2 Ventas Artboards.dc.html`
- `Pantalla 3 Programacion y cierre Artboards.dc.html`
- `Pantalla 4 Landing cobro Artboards.dc.html`
- `Pantalla 5 Cobranza Artboards.dc.html`
- `Pantalla 6 Banca Artboards.dc.html`
- `Pantalla 7 Factoring Artboards.dc.html`
- `Pantalla 8 Integraciones Artboards.dc.html`
- `Pantalla 9 Configuracion DTE Artboards.dc.html`
- `Pantalla 10 Flujo de caja Artboards.dc.html`
- `Finanzas Hoja de componentes.dc.html`
- `Finanzas Indice.dc.html`

`Finanzas Hoy.dc.html`, `Finanzas Bloques.dc.html`, `Finanzas Cuerpo.dc.html`, `Finanzas Sheet.dc.html` y `Finanzas Pantalla.dc.html` son los componentes fuente que las pantallas anteriores importan; `finanzas-data.js` trae los datos ficticios que consumen.

## Pendientes para la construcción

1. ~170 tamaños de letra a mano (`font:` inline en los bloques) pasan a estilos `t-*` del DS V2.
2. «± semanas» en el Sheet «Mover partida» del flujo de caja necesita su N (hoy el ejemplo usa −2, −1, +1, +2 sin un tope definido).
