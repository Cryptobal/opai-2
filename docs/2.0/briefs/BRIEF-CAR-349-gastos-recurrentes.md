# Brief CAR-349 · Gastos recurrentes del flujo de caja (bloque 1 de 3)

**Sesión Caja · 12-nov-2026 · Fixes CAR-349 (parcial) · Relacionado: CAR-269, CAR-343, ADR-026, ADR-073**

## 1. Objetivo

Que los gastos fijos de la empresa (arriendo, honorarios, cuotas de impuestos, provisiones) se proyecten solos en el flujo y se den por pagados cuando aparece el cargo en el banco, sin que nadie digite celdas.

## 2. Estado actual

- **OPAI 1** (solo lectura, `c5589da`): `FinanceFlowPlanRecurrence` copia cada regla a celdas de plan 12 meses hacia adelante; un cron las reescribe. El cargo real se cruza aparte; si no calza, se cuenta dos veces o se da por cumplida la celda a mano. Gard tiene 12 reglas vigentes.
- **OPAI 2**: no existe. Los egresos se digitan celda por celda.

## 3. Alcance de este PR

1. Dominio puro (`modules/finanzas/domain/recurrentes*.ts`):
   - Cuotas semanales, quincenales o mensuales; el día se ajusta en meses cortos y −1 es el último día.
   - Término por fecha o por cantidad de cuotas, contadas desde el inicio.
   - Cruce con los cargos de su fila: prefiere el de monto exacto y, entre esos, el más cercano en fecha. Cada cargo paga una sola cuota; lo parcial deja el resto proyectado.
2. Tabla `finanzas.flujo_recurrentes`, migración aditiva con RLS y trigger mismo_tenant.
3. Capacidades `finanzas.recurrentes.listar/crear/actualizar`, con vista previa y MCP.
4. La planilla suma las cuotas desde la semana en curso, en la capa «comprometido»:
   - lo pagado antes del lunes ya está en el saldo y no se proyecta;
   - lo pagado esta semana sí suma;
   - una cuota vencida e impaga (hasta 31 días atrás) pasa a la semana en curso.

**Bloques siguientes:** UF y % de ventas del mes anterior; categorías por empresa y retiro de socios por socio; importador desde OPAI 1 con vista previa; pantalla con diseño Hilo.

## 6. Modelo de datos y migraciones

`20261213100000_finanzas_flujo_recurrentes`: tabla nueva, aditiva, con `lock_timeout` de 5 s. La aplica la sesión (ADR-104) con respaldo, primero en `dev` y después en `main`.

## 9. Seguridad y tenant

- RLS `tenant_isolation` con ENABLE y FORCE.
- Trigger `mismo_tenant` sobre `fila_id`.
- La prueba confirma que otra empresa no ve los recurrentes y no puede crear uno en una fila ajena.
- Se agregó la siembra a la prueba de dos empresas.

## 12. Tests

- Dominio: 14 pruebas.
- Base real: 4 pruebas (validación y vista previa, proyección semanal sin escribir celdas, cuota pagada antes del lunes y vencida impaga, cargos idénticos y aislamiento).
- `packages/db` completo (100 suites, 416 pruebas).
- Flujo, banco y paridad en verde.

## 15. Riesgos y rollback

- Si una fila tiene a la vez celdas de plan a mano y un recurrente, se suman las dos. La pantalla de recurrentes debe avisarlo; queda para el bloque de pantalla.
- Rollback: revertir el PR. La tabla queda vacía hasta que se carguen recurrentes.
