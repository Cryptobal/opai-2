# BRIEF-38 · Flujo de caja B2: fecha esperada de cobro (CAR-193, PR 3 de 4)

**Rama:** `brief/car-193-flujo-b2-cobro-esperado` (parte de la rama del PR B1) · **Migración aditiva** (una tabla nueva) · Reglas: [ADR-073](../01-decisiones.md) 5, 6 y 10. Sigue: C (factoring, IVA y PPM, interfaz del diseño v4).

## Qué cambia
1. **Un solo criterio de semana (regla 5).** La fecha esperada de cobro de una factura es: la fijada a mano; si no, emisión + promedio real de días de pago del cliente (solo con 3 o más facturas pagadas con cobro conciliado en los últimos 24 meses); si no, el vencimiento. Lo vencido o ya pasado va a la semana en curso. Una sola función (`ingresosEsperados`, `packages/capabilities/src/finanzas/cobro-esperado-datos.ts`) alimenta la planilla, `finanzas.ventas.proyeccion_flujo`, `finanzas.derivadas.listar` y los demás lectores. Se eliminan `semanaComprometidoDte` y `celdasDerivadasDte`, que ubicaban la factura en su semana de emisión.
2. **La planilla suma los cobros esperados.** Fila del sistema «Cobros esperados (facturas)» con una celda comprometida por factura (la nota de la celda dice el día esperado y de dónde sale). Solo semanas desde la actual: el pasado lo cuenta la cartola. Planilla, aviso y «Reprogramar» usan la misma serie.
3. **Pendiente neto (regla 6).** Pendiente = monto − NC parciales (61 emitidas, monetarias) − cobrado, con la misma regla de ADR-068. La NC deja de ser una celda negativa; la ND (56) no es deuda ni ingreso; las cedidas no cuentan.
4. **Programadas (regla 10).** Cada programación recurrente proyecta una fila por período con el mismo criterio (promedio del cliente si lo hay; si no, emisión + plazo). Cuando el período ya tiene borrador o factura emitida, manda ese y la proyección se oculta (CAR-184, sin cambios).
5. **Fijar a mano.** Capacidad `finanzas.cobros.fijar_fecha_esperada` (pantalla, `/api/v1` y MCP, con `preview_` y `idempotencyKey`): sin fecha vuelve a la automática. Tabla nueva `finanzas.flujo_cobro_esperado` (RLS `tenant_isolation`, trigger de mismo tenant, `DELETE` en cascada con la factura).
6. **Hora de Chile** en el cálculo de «hoy» de la proyección (antes UTC).

## Migración
`20261107160000_finanzas_flujo_cobro_esperado`: solo crea la tabla (con RLS ENABLE + FORCE, política, trigger e índices); no toca datos. Reversión en el archivo.

## Pruebas
Dominio (`cobro-esperado.test.ts`); base (`finanzas-flujo-cobro-esperado-db.test.ts`): vencida → semana actual, pendiente neto de NC parcial, ND y cedida fuera, promedio con 3 facturas pagadas, fijar con vista previa que no escribe, aparece en la planilla y vuelve a la automática, otra empresa recibe «no encontrado». Se comprobó que el test de ND/cedida falla si la ND vuelve a contar.

## Corregido tras la autorrevisión
- Solo las facturas 33 y 34 entran al flujo, al promedio de pago y a la fecha manual: son las únicas que se concilian contra el banco; una boleta o una guía quedaban «por cobrar» para siempre. Fechas manuales validadas (calendario real, años 2000 a 2100). Las programaciones se calculan solo hasta la última semana pedida. El evento de cambio no se emite si volver a la automática no cambió nada.

## Pendiente
- Semana en curso: si un cliente depositó esta semana y el abono aún no está conciliado, el saldo del banco ya lo incluye y la factura sigue «por cobrar» en «Cobros esperados» (se cuenta dos veces hasta conciliar). La cartola de la semana en curso no entra al cálculo. Se mitiga con la conciliación automática (ADR-074, bloque 7); un aviso en pantalla va en el PR C.
- Un borrador o factura sin emisión ni vencimiento no se proyecta (sin fecha no hay semana); se aviará en pantalla en el PR C.
- La edición de la fecha desde la traza de la celda (pantalla) va en el PR C junto con el diseño v4; hoy se hace por la capacidad (API/MCP).
- El cálculo de las programaciones por período puede ser pesado con muchas programaciones activas (se limita a 200 y 60 períodos); si la planilla se nota lenta se cachea por lectura.
- «Diferencia factoring» no se resta del saldo (adenda a ADR-073 en PR C).
