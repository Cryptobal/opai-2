# Export de diseño — Nómina (v2)

Diseño de **Nómina y Cumplimiento DT** (períodos, cierre, liquidaciones, novedades, archivos y declaraciones, contratos y anexos ante la DT, finiquito, configuración y calendario de obligaciones) aprobado en Claude Design, versión v2.

- **Proyecto de Claude Design:** `2c33bd33`.
- **Export:** 30-oct-2026 15:30 CLT.
- **Revisión:** operador, 30-oct-2026 ~15:40 CLT (revisión estática, sin render) contra el prompt de origen y el ajuste v2, que están en `alcance/` del computador del operador (no en este repo).

## Pantallas

- `Indice.dc.html` — Índice.
- `01 Periodos de remuneraciones.dc.html` — Períodos de remuneraciones.
- `02 Cierre de mes.dc.html` — Cierre de mes.
- `03 Liquidaciones del periodo.dc.html` — Liquidaciones del período.
- `04 Liquidacion de una persona.dc.html` — Liquidación de una persona.
- `05 Novedades del periodo.dc.html` — Novedades del período.
- `06 Archivos y declaraciones.dc.html` — Archivos y declaraciones.
- `07 Cumplimiento DT contratos y anexos.dc.html` — Cumplimiento DT: contratos y anexos.
- `08 Finiquito.dc.html` — Finiquito.
- `09 Configuracion Modulos Nomina.dc.html` — Configuración › Módulos › Nómina.
- `10 Calendario de obligaciones.dc.html` — Calendario de obligaciones.
- `B1 Cuadratura contra 1.0.dc.html` — Cuadratura contra 1.0.
- `B2 Anticipo quincenal automatico.dc.html` — Anticipo quincenal automático.
- `B3 Prestamos con plan de cuotas.dc.html` — Préstamos con plan de cuotas.
- `Hoja de componentes.dc.html` — Hoja de componentes.

`p01-periodos.dc.html` … `p10-calendario.dc.html` y `pB-propuestas.dc.html` son los componentes fuente de las pantallas anteriores. `nomina-data.js`, `ds-base.js` y `_gen-artboards.js` son datos y ayudas del export.

Cada pantalla trae 375/1024/1280 px en claro y oscuro, y los estados vacío, cargando, error y sin permiso.

Datos de ejemplo ficticios: Atlas Seguridad SpA, RUT 76.111.222-3, Marcela Rojas.

## Decisiones

- **B1, B2 y B3 van las tres** (decisión de Carlos, 30-oct-2026 14:44 CLT): B1 enlazada desde 02 Cierre, B2 desde 05 Novedades y B3 desde 04 Liquidación y 05 Novedades.
- **La configuración vive en Configuración › Módulos › Nómina** (regla de Carlos, 30-oct-2026 12:10 CLT), no en una pantalla propia del módulo.

## Pendientes menores (no bloquean)

- (resuelto 30-oct-2026) El bundle `_ds` compartido traía un nombre real en la descripción por defecto de Forbidden y en su readme; se corrigió una sola vez en el DS.
- Miniatura SVG de los envoltorios con `#4a3fd8`/`#ffffff`.
- Los códigos LRE de 09 (1101, 1105…) van marcados «Por verificar»; hay que validarlos al construir.
- Los formatos de Previred, suplemento LRE, SII y archivo de pago del banco siguen «por verificar».
- El export autocontenido (`export/`, 49 MB) no se sube: se regenera desde los `.dc.html`.
