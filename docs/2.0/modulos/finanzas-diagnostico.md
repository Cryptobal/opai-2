# Finanzas — Diagnóstico parte por parte (4-nov-2026)

Revisión del código de `main` en `e49bee1` (Sesión 5, CAR-189), solo lectura. Acompaña a la [hoja de alcance](finanzas.md). La referencia de 1.0 es su MCP en producción (217 herramientas, inventario en [BRIEF-31](../briefs/BRIEF-31-bot-operativo.md) y [mcp-inventario](../paridad/mcp-inventario.md)) y las extracciones de `extraccion/`. Reemplaza, para Finanzas, la foto del 3-nov de la auditoría CAR-163 (#241), que quedó desactualizada: F1 a F8a y R1 ya entraron.

**Base:** el manifest de `modules/finanzas` declara 77 capacidades, 43 eventos y 13 permisos; las capacidades viven en dos lugares (`packages/capabilities/src/finanzas` y `modules/finanzas/capacidades`; unificarlas, F8b, quedó diferido por acoplamiento circular). Menú: Hoy, Ventas, Cobranza, Compras, Bancos y Flujo.

**Pantalla frente a MCP, en general:** el gate de paridad se cumple. Ninguna acción de pantalla de Finanzas queda fuera del MCP; solo la composición (descargar el PDF, la secuencia crear → validar → emitir) vive en la pantalla, y cada paso es una capacidad. Al revés, hay cosas **solo por MCP, sin pantalla**: `finanzas.reportes.resultados`, `derivadas.listar`, `ventas.proyeccion_flujo`, `bancos.saldo_sugerido`, `filas.actualizar`, las reglas de conciliación y el enlace a una fila del flujo. La apertura desde 1.0 es solo para personas por decisión (ADR-064) y no tiene pantalla: hoy solo se ejecuta por `/api/v1` con sesión.

## Bancos

- **Funciona:** cuentas, importar cartola (Santander y genérica, vista previa por fila, sin duplicar), sincronización por Web4Leads con webhook firmado por empresa, movimientos por estado, aviso de saldo bajo.
- **Roto o riesgoso:** los movimientos de Gard siguen llegando a 1.0 hasta que Carlos cambie la URL en Web4Leads y cargue el secreto. Una cuenta no reconocida responde 200 sin avisar. Los sospechosos solo se cuentan. Lo que queda «por autorizar» no se puede autorizar ni ignorar. El saldo del banco no se compara con lo registrado. La lista corta en 200 sin páginas ni fechas.
- **Falta frente a 1.0:** detalle de un movimiento, resumen de revisión, estado de conciliación, comparar cartola, cuadrar saldo, resolver duplicados, autorizar.

## Conciliación

- **Funciona:** sugerencias (RUT, glosa, monto) en ±15 días; conciliación N:M de 1 a 10 enlaces con suma exacta, candado por documento y tope del pendiente (ADR-068); deshacer; cobro manual desde la ficha de venta.
- **Roto o riesgoso:** las reglas se guardan y **no se evalúan** (sin esquema, sin pantalla). `sugerir` se declara lectura pero escribe el estado «sugerido». Enlazar a una fila del flujo no valida que la fila exista. En compras el pendiente no descuenta NC recibidas. Las NC no sirven como enlace.
- **Falta frente a 1.0:** estado de conciliación, clasificar a una fila del flujo con vista previa propia, cuadrar saldo.

## Factoring

- **Funciona:** simular (merma = total × tasa) y ceder con Octava real (irreversible, con aprobación humana), seguimiento horario del RPETC, lista de cesiones, hoja «Ceder» en la ficha.
- **Roto:** si el RPETC anula o rechaza la cesión, la factura queda «cedida» para siempre: no se cobra ni se vuelve a ceder. «Financiada» nunca se asigna. Falta la prueba en certificación con Gard (#306).
- **Falta:** registrar el anticipo y el costo, conciliar el abono del factor (hoy la conciliación rechaza las cedidas), el remanente al vencimiento, catálogo de factorings, ceder por lote. En el flujo, una glosa con «FACTORING» manda incluso el abono a «Costo factoring».

## Flujo de caja

- **Funciona:** planilla semanal, filas y secciones, mover y cumplir, importar CSV, aviso de saldo negativo, celular. Todas sus capacidades tienen MCP.
- **Roto frente a las reglas de Carlos (detalle en ADR-073):** semanas pasadas solo con lo **conciliado** (lo no conciliado y los pagos a proveedores no aparecen), así que una conciliación tardía **sí** cambia el pasado y no hay prueba. El saldo parte de un número fijo de los ajustes, no del banco. Dos criterios de semana: el derivado de DTE usa la emisión y la proyección de ventas el vencimiento; ninguno pasa lo vencido a la semana actual; y la planilla no muestra ninguno de los dos. La ND suma como ingreso. No hay IVA ni PPM. Tres umbrales distintos y ningún valor de $15M. Se pueden cargar ingresos a mano (`celdas.fijar`, `celdas.cumplir`, importar). Quedan restos del sellado (tabla, permiso, eventos, tolerancia). La lectura escribe (crea la fila «Cobros»). «Hoy» se calcula en UTC.
- **PR #246 (CAR-181):** resuelve hora de Chile, lectura sin escritura, cartola completa con filas «Sin clasificar», abono y costo de factoring separados, una sola serie de saldos e importación todo o nada. Conflicto con `main` solo en `hoja-mover.tsx` y `ESTADO.md`; hay que revisar a mano su efecto sobre la conciliación tras ADR-068.
- **CAR-184:** el borrador del período ya no cuenta dos veces (con prueba); falta la prueba de la factura emitida.

## Ventas y facturación

- **Funciona:** validación previa, emisión irreversible con aprobación, envío y consulta al SII, configuración DTE con pantalla, folios (CAF), NC total o parcial (códigos 1, 2 y 3), PDF, enviar al cliente con historial, programaciones con borradores por período sin duplicar, cierre de mes con emisión en lote.
- **Crítico:** ningún candado impide emitir en el SII real desde test.opai.cl: el ambiente es un dato de la empresa y solo `NODE_ENV=test` o `SII_ADAPTADOR=simulado` fuerzan el simulado. Lo mismo vale para ceder con Octava.
- **Alto:** la emisión llama a SimpleAPI dentro de la transacción; el lote hace hasta 50 llamadas en una sola (si falla después de firmar, el folio vuelve atrás y el DTE ya existe). El PDF es texto plano sin recuadro de RUT y folio, sin detalle de líneas, sin logo, sin PDF417 gráfico ni copia cedible: no sirve para un cliente real.
- **Falta frente a 1.0:** **nota de débito (56)**, editar líneas, destinatarios y referencias de un borrador, descartarlo, NC por borrador, cambiar el centro de costo de un DTE. Las programaciones importadas de 1.0 no copian al borrador sus referencias (OC/HES) ni sus destinatarios, y no usan sus marcas de envío automático.
- **Proforma y estado de pago:** solo seguimiento manual en el cierre de mes; no hay fecha pactada por programación, documento, envío automático, recordatorio ni enlace de OK del cliente.
- **Correos:** el motor de plantillas por empresa existe (`core.plantillas.*`, vista previa y prueba), pero Finanzas solo declara dos plantillas (factura y cobranza): la NC sale con la de factura y no hay proforma ni estado de pago. Los destinatarios son siempre los contactos de facturación. El registro de envíos existe para DTE y para cobranza, no para lo demás.
- **ESTADO desactualizado:** la fila de #234 (SimpleAPI real) decía «En revisión» y migración «no aplicada», aunque se integró el 3-nov y la tabla de migraciones la da por aplicada; se corrigió en este PR y se pide al bot confirmarlo.

## Cobranza

- **Funciona:** aging (por vencer, 1-30, 31-60, 61+), recordatorios en días hábiles (+3, +7, +12), pausa, gestiones, ficha del deudor; el pendiente descuenta NC parciales y la ND no suma; lo importado de 1.0 no entra a los recordatorios automáticos (con prueba).
- **Riesgoso:** «Hoy en Finanzas» sí cuenta recordatorios de lo importado, que el trabajo nunca envía. Posible doble envío en corridas simultáneas; el correo no pasa por el medidor; carga en memoria O(n).
- **Falta frente a 1.0:** página pública de pago, OK del cliente por enlace.

## Compras

- **Funciona:** libro, registrar, importar RCV (CSV), proveedores, centros de costo por instalación. Todo con MCP.
- **Falta frente a 1.0:** RCV automático, documentos recibidos con XML, acuse y reclamo en 8 días, pagos a proveedores, NC recibidas en el pendiente. Sin confirmar el formato del RCV con un archivo real.

## Contabilidad e informes

- **Funciona:** plan de cuentas (pantalla desde Configuración) y un resultado de caja por mes, solo por MCP, que no es un estado de resultados contable.
- **Falta frente a 1.0:** asientos y períodos, estado de resultados, balance, mayor, rentabilidad por instalación, informe de ventas por cliente, libros IVA y base del F29 (CAR-171, 172, 173).

## Hoy en Finanzas y apertura

- «Hoy» cuenta borradores, programaciones vencidas, facturas vencidas, recordatorios y movimientos pendientes; le faltan saldo del banco, OC/HES y proforma.
- Apertura desde 1.0: idempotente y reversible; el exportador de 1.0 no trae documentos ni saldos bancarios; falta bloquear el reenvío de lo importado.

## Vender una parte sola

Hoy no se puede: `core.tenant_modules` tiene una fila por módulo y el permiso de cada capacidad se decide por el prefijo de su id (`finanzas.*`), así que Finanzas se enciende o se apaga entero. La propuesta (ADR-072) agrega la **parte** a cada capacidad, entrada de menú y permiso, guarda las partes contratadas junto al módulo y filtra con ellas en la autorización, el menú, `core.me` y la lista de herramientas MCP, sin renombrar ids ni romper la instantánea del MCP.

## Diseño

Hay diseño aprobado para casi todo (`diseño/export-finanzas-ventas-banca-v3`, `export-flujo-caja-v3`, `export-finanzas-compras`). El del flujo trae «Cierre semanal» y «Metas», que salen con ADR-073: los bloques del flujo usarán ese diseño sin esas pantallas y con las filas nuevas (Sin conciliar, IVA, PPM, Costo factoring). Proforma, estado de pago y plantillas de correo no tienen diseño propio: se usarán «Programación y cierre» y Configuración › Comunicaciones, y se reportará en cada brief.
