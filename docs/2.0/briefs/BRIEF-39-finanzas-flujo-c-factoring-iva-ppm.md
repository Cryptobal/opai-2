# BRIEF-39 · Flujo de caja C: factoring, IVA, PPM y doble conteo (CAR-193, PR 4 de 4)

**Rama:** `brief/car-193-flujo-c-factoring-iva-ppm` (sobre `main` con #346) · **Dos migraciones** (una tabla aditiva y una de datos) · Reglas: [ADR-073](../01-decisiones.md) 4 y 5 y sus dos adendas del 5-nov-2026. **Solo lógica**: el diseño v4 del flujo y la clasificación de cargos a filas de egresos esperan a Carlos.

## Qué cambia
1. **Factoring (regla 4).** El ingreso de una factura cedida es el **depósito neto del factor** (el anticipo: monto menos su descuento), en la semana del depósito: por la fecha del banco si ya está en la cartola; si no, en la semana de la cesión (o la actual si ya pasó), en la fila «Depósitos del factor (facturas cedidas)». La factura cedida no está en «Cobros esperados». No hay remanente ni ingreso posterior. La **diferencia** (monto − depósito) va a una fila **informativa** con la cuenta que elige la empresa (ajuste `flujo_cuenta_diferencia_factoring`: «Diferencia factoring» o «Gasto financiero») y **no suma al saldo**. Se elimina la regla por glosa `/MERMA|FACTORING/` de `derivadas/banco.ts` y las filas «Abono factoring» y «Costo factoring».
2. **IVA (regla 5).** Fila «IVA a pagar»: IVA del mes M = débito (ventas 33 y 34 y notas de débito 56, menos notas de crédito 61) − crédito (compras recibidas), nunca bajo 0; se paga en M+1 el día de IVA del calendario de pagos de la empresa (20 por defecto). Capacidad `finanzas.flujo.postergar_iva` (período, postergar sí/no; pantalla, `/api/v1` y MCP con `preview_`; `idempotencyKey`, auditoría y evento `finanzas.flujo.iva_postergacion_cambiada`) lleva el IVA de ese mes a M+2. Tabla `finanzas.flujo_iva_postergado`. Cuando la semana del pago ya pasó manda la cartola: no se proyecta.
3. **PPM.** Fila «PPM»: tasa de la empresa (ajuste `flujo_tasa_ppm_bps`, puntos base; 0 por defecto = no se proyecta) × ventas netas y exentas del mes M, en M+1 el mismo día que el IVA. Nunca se posterga.
4. **Doble conteo de la semana en curso.** Función pura `emparejarAbonosConCobros` (dominio): un abono sin conciliar de la semana en curso (de los últimos 28 días para depósitos de factor) que coincide con el monto pendiente y con el RUT de la glosa (cliente o factor) oculta ese cobro proyectado; con el mismo monto sin RUT que calce se mantiene y `planilla.obtener` devuelve un aviso «Posible cobro ya recibido: concilia el abono de $ X». Un abono se usa una sola vez y las coincidencias seguras tienen prioridad. **Regla elegida:** coincidencia exacta de monto más RUT, porque un monto solo puede repetirse entre clientes y ocultar un cobro que no llegó sería peor que avisar de más.
5. **Umbral de saldo bajo.** $10.000.000 por defecto, configurable por empresa (adenda de ADR-073). Migración de datos `20261107180000`: cambia el DEFAULT y lleva a $10.000.000 los ajustes en $15.000.000 que nadie editó (`updated_at = created_at`); exige BYPASSRLS, cuenta las filas esperadas y afectadas y falla si difieren. Simulada contra tres ajustes (sin tocar en 15M, editado a mano en 15M y otro valor): solo cambia el primero.

## Migraciones
- `20261107170000_finanzas_flujo_iva_postergado`: solo crea la tabla (RLS ENABLE + FORCE, política `tenant_isolation`, único por empresa y mes, CHECK del formato `aaaa-mm`). No lleva trigger `mismo_tenant`: no referencia otra tabla de la empresa.
- `20261107180000_finanzas_flujo_umbral_diez_millones`: valor por defecto y datos (ver arriba). Reversión en cada archivo.

## Cambio visual (A2.10)
Mínimo, sobre la planilla existente: filas «Depósitos del factor», «IVA a pagar», «PPM» y la informativa de la diferencia; y un aviso (`Alerta` del DS, el mismo que ya muestra los avisos del saldo) con «Posible cobro ya recibido…». Sin pantallas ni componentes nuevos.

## Corrección al doble conteo de la semana en curso (regla mejor, con su justificación)
La apertura de la semana en curso es el saldo del banco menos todo lo ya movido esta semana (B1), y los ingresos de la semana salen solo de la proyección. Por eso ocultar la factura cuando un abono la explica **no basta**: el abono sale de la apertura y la factura ya no lo vuelve a sumar, y el saldo final queda corto por ese monto. Lo mismo pasa con un abono ya conciliado esta semana (su factura está pagada y no se proyecta). Comprobado: banco $10.000.000, abono conciliado de $1.000.000 → saldo final de la semana $9.000.000. Regla: **los abonos ya movidos esta semana vuelven a la semana como ingreso real** (`abonos-semana.ts`, misma fila que en las semanas pasadas: la del documento si está conciliado, «Sin conciliar» si no). Con eso, la coincidencia segura (factura oculta) deja la semana en $10.000.000; en la coincidencia no segura la factura se mantiene y el aviso dice que concilie, como pidió Carlos (ahí el mismo cobro queda contado dos veces hasta conciliar, y el aviso lo advierte). Tests: `finanzas-flujo-semana-en-curso-db.test.ts`.

## Umbral: qué ajustes cambia la migración
Los que están exactamente en $15.000.000 (el defecto de B1, que Prisma no distingue por `updated_at`); cualquier otro valor lo fijó la empresa y no se toca. Un 15.000.000 elegido a mano es indistinguible del defecto. Test: `packages/db/test/finanzas-umbral-migracion.test.ts`.

## Pruebas
Dominio: `iva-ppm.test.ts`, `cobro-recibido.test.ts`. Base: `finanzas-flujo-impuestos-db.test.ts` (M+1 por defecto, postergado a M+2, desmarcar vuelve a M+1, PPM en M+1 aunque se postergue el IVA, segundo tenant sin efecto) y `finanzas-flujo-factoring-db.test.ts` (cesión de 10.000 con depósito de 9.800: ingreso 9.800, saldo +9.800 y diferencia 200 sin efecto en el saldo; depósito ya recibido sin conciliar no se cuenta dos veces; abono con RUT del cliente oculta la factura; abono sin RUT se mantiene y avisa; abono de otro monto no hace nada). Se comprobó que los de doble conteo fallan si se desactiva el emparejamiento.

## Pendiente
- Pantalla del marcador de postergación, edición de la fecha esperada desde la traza de la celda y el resto del diseño v4 (Carlos).
- Clasificación de cargos del banco a filas de egresos (Carlos).
- Las programaciones no entran al IVA proyectado (solo lo emitido y recibido); el IVA de un mes abierto crece a medida que se emite.
- Depósito del factor conciliado: hoy la conciliación rechaza las cedidas (bloque 7), así que en la práctica el depósito llega sin conciliar y lo cubre el emparejamiento por RUT; cuando se concilie contra la cesión pasará a la semana del depósito.
- Con tasa de PPM en 0 no hay fila de PPM; la tasa por empresa la define Carlos.
