# BRIEF-39 · Flujo de caja C: factoring, IVA y PPM (CAR-193, PR 4 de 4)

**Rama:** `brief/car-193-flujo-c-factoring-iva` (parte de la rama del PR B2) · **Migración aditiva** (una tabla nueva) · Reglas: [ADR-073](../01-decisiones.md) 4 y 5, con la adenda del 5-nov-2026 (la diferencia del factoring es informativa). La edición en pantalla (traza de la celda, marcador de postergación) va en un PR de interfaz aparte, con el diseño v4 aprobado.

## Qué cambia
1. **Factoring (regla 4).** Se elimina la regla por glosa («MERMA» o «FACTORING») que mandaba el abono a «Costo factoring» y la comisión a otra fila: el depósito del factor es el ingreso y sigue el mismo camino que cualquier cobro (conciliado a su factura, a la fila del cliente; sin conciliar, a «Sin conciliar»). La **diferencia** (el descuento de cada cesión) aparece en una fila **informativa** rotulada con la cuenta que elige la empresa (ajuste `flujo_cuenta_diferencia_factoring`: «Diferencia factoring» por defecto, o «Gasto financiero»), en la semana de la cesión. **No suma al saldo**: los totales de cada semana son iguales con y sin la cesión (test).
2. **IVA y PPM (regla 5).** Dos filas de egresos comprometidos en la planilla: «IVA a pagar» y «PPM». El IVA del mes M (débito de las ventas emitidas − crédito de las compras recibidas, la NC resta) se paga el día 20 de M+1 (o el día configurado en el calendario de pagos) junto con el PPM (tasa en puntos base sobre las ventas netas y exentas del mes; ajuste `flujo_tasa_ppm_bps`, **0 por defecto: no se proyecta hasta que se configure**). Un pago cuya semana ya pasó lo cuenta la cartola, no se proyecta.
3. **Postergar el IVA.** Capacidad `finanzas.impuestos.postergar_iva` (pantalla, `/api/v1` y MCP, con vista previa): marca o desmarca el mes para llevar su IVA a M+2; el PPM siempre queda en M+1. Tabla `finanzas.flujo_iva_postergado` (RLS, único por mes).
4. **Ajustes por empresa** en Configuración › Módulos › Finanzas › «Flujo de caja»: tasa de PPM y cuenta de la diferencia del factoring.

## Migración
`20261107170000_finanzas_flujo_iva_postergado`: solo crea la tabla (RLS ENABLE + FORCE, política `tenant_isolation`, único por empresa y mes, CHECK del formato `aaaa-mm`). No toca datos. Reversión en el archivo.

## Pruebas
Dominio (`iva-ppm.test.ts`: calendario, débito − crédito con NC, PPM, postergación); base (`finanzas-flujo-impuestos-db.test.ts`): IVA y PPM en M+1, postergar con vista previa que no escribe y vuelta a M+1, la diferencia del factoring con la cuenta elegida sin cambiar ningún total, y una segunda empresa que no ve nada.

## Pendiente
- Pantalla: marcador de postergación por mes y edición de la fecha esperada desde la traza de la celda (PR de interfaz con el diseño v4).
- Las programaciones aún no entran al IVA proyectado (solo lo emitido y recibido); el IVA de un mes abierto crece a medida que se emite.
- La diferencia del factoring usa la fecha de creación de la cesión como semana; cuando se concilie el depósito del factor (bloque 7) pasará a la semana del depósito.
- Con tasa de PPM en 0 no hay fila de PPM; Carlos decide la tasa por empresa.
