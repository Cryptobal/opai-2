# Brief CAR-343 · Saldo llevado a hoy y cuadratura mensual al peso

**Sesión Caja · 12-nov-2026 · Fixes CAR-343 · Relacionado: CAR-269 (diagnóstico), CAR-345 (saldo por Web4Leads), ADR-026, ADR-073**

## 1. Objetivo

Decisión de Carlos del 12-nov-2026: el saldo de partida del flujo es el que informa el banco (Web4Leads o cartola provisoria). A ese saldo se le suma y resta lo proyectado. El flujo debe usarlo bien aunque sea de hace días, y debe poder comprobarse al peso contra la cartola, mes a mes.

## 2. Estado actual (verificado en `main` 57d0914)

- `serieSaldos` ancla la semana en curso en el último saldo conocido por cuenta (`saldoDelBanco`). Solo restaba lo movido **esta semana** hasta la fecha del saldo.
- Si el saldo conocido es antiguo (la apertura de 1.0, o la última cartola que trae saldo), se tomaba como si fuera el de hoy. Los movimientos entre esa fecha y el lunes no se sumaban.
- No había forma de cuadrar el saldo calculado con el saldo final de cada cartola.

## 3. Alcance

1. **Saldo llevado a hoy:** el saldo conocido de cada cuenta se lleva con la cartola desde su fecha hasta el domingo anterior a la semana en curso (apertura) y hasta hoy. Con un saldo de esta semana resta lo ya movido, como antes; con uno antiguo suma lo posterior. Lo movido el mismo día del saldo ya está en él.
2. **Planilla:** `saldoBanco` agrega `saldoHoy` (saldo conocido más lo posterior) y `saldoDesde` (fecha del saldo más antiguo).
3. **Cuadratura mensual:** capacidad nueva de lectura `finanzas.cuadratura.mensual` (API y MCP `finanzas_cuadratura_mensual`). Por cuenta y mes, entre `desde` y `hasta` («aaaa-mm», hasta 36 meses), entrega saldo inicial, abonos, cargos, saldo final y cantidad de movimientos. Siempre cumple inicial + abonos − cargos = final. Una cuenta sin saldo conocido sale con `ancla: null` y sin meses.

Fuera de alcance: pantalla (la cuadratura se verá en la vista de proyección con diseño Hilo), lector de cartolas y conciliación (sesión Finanzas, CAR-341), y cargar datos en Gard.

## 4. Arquitectura

Dominio puro en `modules/finanzas/domain/cuadratura.ts` (`saldoAlCierre`, `cuadraturaMensual`). Capacidad delgada en `modules/finanzas/capacidades/cuadratura.ts` y ajuste del ancla en `saldo-llevado.ts`, que usa `serie-saldos.ts`. Una consulta por lectura.

## 5. Archivos

`modules/finanzas/domain/cuadratura.ts` y su test; `modules/finanzas/capacidades/{cuadratura,saldo-llevado,serie-saldos,lectura,index}.ts`; `packages/capabilities/test/finanzas-flujo-cuadratura-db.test.ts`; instantánea MCP e inventario de paridad.

## 6. Modelo de datos y migraciones

Sin migración.

## 7. Capacidades

`finanzas.cuadratura.mensual`: lectura, permiso `finanzas:flujo.ver`, MCP y `/api/v1`.

## 9. Seguridad y tenant

Todo pasa por `ctx.db` del tenant. La prueba confirma que otra empresa no ve cuentas ajenas.

## 10. Casos límite (cubiertos por pruebas)

- Movimientos del mismo día y monto: cuentan los dos.
- Movimiento el mismo día del saldo conocido: ya está en el saldo.
- Domingo y lunes en el borde de la semana; último y primer día del mes.
- Meses anteriores al saldo conocido: se reconstruyen hacia atrás.
- Movimientos «ignorados» (la apertura de 1.0) no suman.
- Rango invertido o de más de 36 meses: error de negocio.

## 12. Tests

- Dominio: 9 pruebas.
- Base real: 4 pruebas:
  - la apertura de la semana es el saldo antiguo llevado con la cartola;
  - cada semana pasada cierra con el saldo de su domingo;
  - la cuadratura cuadra en cada corte mensual y suma todos los movimientos;
  - aislamiento entre empresas.
- Siguen en verde las 17 suites de flujo y banco.

## 13. Validación con datos reales

Cuando Gard tenga saldo del banco (CAR-345) y las cartolas completas (CAR-341), se corre `finanzas_cuadratura_mensual` por MCP en test.opai.cl. Se compara el saldo final de cada mes con el saldo final de cada cartola, y se anota en CAR-269 si cuadra o en qué mes no, sin montos.

## 15. Riesgos y rollback

Si un movimiento falta o sobra en la cartola cargada, el saldo de las semanas pasadas se corre en ese monto. Eso es justamente lo que la cuadratura deja ver. Rollback: revertir el PR; no hay datos que deshacer.
