# Export flujo-caja v3 (Claude Design)

Origen: Claude Design. Aprobado por Carlos el 30-oct-2026 a las 21:19 CLT.

Reemplaza al export v1 (#156), según el encargo de este PR. Nota de esta rama: al traer `main` para abrir este PR, `main` ya tenía integrado el export v2 (#161, que a su vez reemplazó a #156) en `docs/2.0/diseño/export-flujo-caja/`; esa carpeta no se toca aquí. Este v3 queda aparte, en `export-flujo-caja-v3/`.

Los `.dc.html` referencian el Design System de OPAI 2.0 **V2** (igual que `export-terreno/` y `export-arco/`); el paquete `_ds/` del export (con datos reales) y la carpeta `uploads/` (prompts con datos reales) no se copiaron a este repo.

## Pantallas

- `Indice.dc.html` — Índice de Flujo de caja
- `01 Planilla del flujo.dc.html` — Semana o mes, capas por celda, columna de hoy, semanas selladas, metas de rendimiento y semanas con saldo negativo proyectado
- `02 Traza de celda.dc.html` — Hechos de la cifra y su origen (instalación o centro de costo); Mover, Dar por cumplida y Nota
- `03 Reprogramar.dc.html` — Mover celdas o la fila ± N semanas con vista previa del saldo y regla de arrastre por fila
- `04 Alerta con salida.dc.html` — Banda bajo el umbral o bajo 0 con tres salidas y su efecto
- `05 Flujo en el celular.dc.html` — Saldo de hoy, próximas 4 semanas, metas y detalle por semana
- `06 Cierre semanal.dc.html` — Saldo sugerido contra banco, motivo y sello; reabrir con confirmación
- `07 Filas y ajustes.dc.html` — Configuración › Módulos › Flujo de caja: lista de módulos, filas (con Administración / Oficina central), calendario de pagos, aviso de saldo negativo y metas
- `08 Estados propios.dc.html` — Cargando, guardando, error con reversión, sin banco, semana sellada, vacío, error y sin permiso
- `09 Hoja de componentes.dc.html` — Variantes y estados de cada componente en claro y oscuro
- `10 Metas y aviso de saldo negativo.dc.html` — Metas de rendimiento bajo la planilla y correo cuando una semana futura queda bajo el umbral del aviso

`Flujo.dc.html`, `Componentes.dc.html` y `Ajustes.dc.html` son los componentes fuente; `flujo.js` y `support.js` son el soporte de datos ficticios (Atlas Seguridad SpA) y de render del export.

## Pendientes para la construcción

Ninguno (aprobado tal cual).
