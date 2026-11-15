# BRIEF CAR-328 · Bancos: filtro por tipo, conciliar contra fila del flujo y cuenta contable, reglas que concilian solas

**Fecha:** 12-nov-2026 · **Pedido:** Carlos (chat del 12-nov, 13:36 y 13:40 CLT) · **Sesión:** Finanzas · **Fixes CAR-328** · Paso 7 de `modulos/finanzas.md` (ADR-074; adenda a ADR-073 del 5-nov).

## 1 Objetivo
Que en Finanzas › Bancos se pueda filtrar ingresos y egresos, reconocer un movimiento sin factura contra una fila del flujo de caja (y su cuenta contable), crear la regla en el mismo paso y que las reglas trabajen solas al llegar movimientos.

## 2 Estado actual (verificado en `main` 77dc76f6)
- `finanzas.movimientos_bancarios.listar` solo filtra por estado; la pantalla no tiene filtro por tipo.
- `finanzas.conciliaciones.confirmar` acepta `flujo_fila`, pero no valida la fila y la hoja «Reconocer» solo ofrece facturas por folio.
- `finanzas.reglas_banco.listar/guardar` existen sin pantalla y sin destino; ninguna capacidad las evalúa (CAR-169 lo dejó pendiente).
- El flujo de caja ya lleva un movimiento conciliado con `flujo_fila` a esa fila (`celdasRealesDesdeMovimientos`).
- En Gard (Neon `main`) hay 0 reglas, 9 facturas emitidas y 4 movimientos: el «Reconocer» de un abono no sugiere nada porque faltan las facturas (lo cubre la migración de CAR-283; no es parte de este brief).

## 3 Alcance
Dentro: filtro por tipo (pantalla, API, MCP); «Reconocer» con modo «Fila del flujo» (fila, cuenta contable opcional, crear regla); pestaña Reglas (lista, editor con alcance, modo, condiciones RUT/glosa/monto/referencia, destino, activa, vista previa de 120 días, «Aplicar a lo pendiente»); evaluación al importar cartola y al recibir Web4Leads.
Fuera: reglas sugeridas por patrón (diseño «Reglas sugeridas», variante B sin aprobar); proveedor como destino; reordenar arrastrando (se usa prioridad numérica); asientos contables (C2).

## 4 Arquitectura
- Dominio puro `packages/domain/src/finanzas/bancos/reglas-banco.ts`: `reglaCalza`, `reglaConciliaSola` (solo con monto exacto **y** referencia igual, modo «todas» y con fila), `primeraReglaQueCalza` (prioridad desc, nombre), `rutsEnTexto`, `definicionDesdeJson` (un formato anterior nunca calza).
- `modules/finanzas/capacidades/bancos/reglas-aplicar.ts` corre en la misma transacción que inserta los movimientos (cartola y Web4Leads): concilia o deja «sugerido»; nunca toca por autorizar, conciliados ni ignorados; la sección de la fila debe calzar con el signo.
- La conciliación por regla deja la regla en `explicacion` y emite `finanzas.banco.conciliacion_confirmada` con `automatica: true`.

## 5 Archivos
Dominio: `reglas-banco.ts` (+ test). Capacidades: `movimientos.ts`, `conciliacion-confirmar.ts` (+ `conciliacion-deshacer.ts` separado), `conciliacion-sugerir.ts`, `reglas.ts`, `reglas-esquemas.ts`, `reglas-aplicar.ts`, `reglas-acciones.ts`, `reglas-sugerir.ts`, `reglas-destinos.ts`, `cartola-importar*.ts`, `sincronizar-aplicar.ts`. Pantallas: `finanzas/bancos/_componentes/*` y `finanzas/bancos/reglas/*`. Semilla `packages/db/scripts/qa-e2e/bancos-reglas.sql`. E2E `finanzas-bancos-reglas-preview.spec.ts`.

## 6 Modelo de datos y migraciones
`20261211100000_finanzas_reglas_banco_destino` (aditiva, `lock_timeout` 5 s): `reglas_conciliacion.flujo_fila_id` y `cuenta_contable_id`, `conciliaciones.cuenta_contable_id`, con FK, índices y verificación de mismo tenant (las reglas no tenían trigger). Reversión al pie del SQL.

## 7 Capacidades
Nuevas: `finanzas.reglas_banco.probar` (lectura), `finanzas.reglas_banco.aplicar` (escritura con vista previa que no escribe), `finanzas.bancos.destinos` (lectura). Cambian: `movimientos_bancarios.listar` (+`tipo`, +`clasificacion`, +`regla`), `conciliaciones.sugerir` (+`reglas`), `conciliaciones.confirmar` (+`cuentaContableId` en el enlace a fila; valida fila, sección y cuenta), `reglas_banco.guardar` (entrada tipada con `definicion`, `flujoFilaId` obligatorio y `cuentaContableId`; emite `finanzas.banco.regla_guardada`), `cartolas.importar` (+`reglas` en la salida real). Todas con su herramienta MCP.

## 8 Interfaz y responsive
Diseño base: «Editor de reglas» (`docs/2.0/diseño/export-finanzas-compras/Reglas.dc.html`) y Banca v3 (`Pantalla 6`). Pestañas por ruta Movimientos · Reglas; filtro con `Segmentado`; montos verdes y rojos; en «Reconocer» un `Segmentado` Facturas/Documentos · Fila del flujo. Sin componentes propios fuera del DS.

## 9 Seguridad y tenant
Todo por `ctx.db` (RLS). Fila y cuenta se validan dentro del tenant y, además, el trigger de mismo tenant. Permisos: ver = `finanzas:bancos.ver`; escribir = `finanzas:bancos.gestionar`. Las lecturas nuevas auditan IDs (salvo `destinos`, catálogo sin datos personales, revisado en la lista cerrada).

## 10 Casos límite
Regla «ambos» con fila de egresos no clasifica abonos; regla sin fila no evalúa; regla de formato anterior aparece con aviso y no calza; dos reglas que calzan → gana la de mayor prioridad; movimiento de remuneraciones queda «por autorizar» y las reglas no lo tocan; RUT dentro de números largos no se inventa (bordes en la expresión).

## 11 Plan por bloques
1 dominio + migración + capacidades · 2 pantallas + semilla + e2e · 3 documentos (brief, ADR-074 adenda, ESTADO, novedad).

## 12 Tests
Dominio `reglas-banco.test.ts` (7). Base `finanzas-reglas-banco-db.test.ts` (5): destino inválido o ajeno, concilia sola y sugiere al importar, filtro por tipo y conciliación manual a fila con cuenta, aplicar con vista previa sin escribir, probar.

## 13 Validación
`pnpm test` completo, typecheck de `apps/web`, `modules/finanzas` y `packages/domain`, lint sin errores, `preview-e2e` a 375, 1024 y 1280 con `qa-e2e`.

## 14 Criterios de aceptación
Los de CAR-328.

## 15 Riesgos y rollback
La migración es aditiva; revertir con el pie del SQL. Una regla mal hecha solo sugiere (o concilia con monto y referencia exactos); toda conciliación se deshace desde «Ver › Deshacer».

## 16 Reporte de ejecución
Ver el PR.
