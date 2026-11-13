-- CAR-394: el flujo de caja parte del saldo del banco (ADR-073); se retiran el saldo inicial
-- manual y la semana de partida de los ajustes, que desde CAR-391 ya no entran en el cálculo.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_ajustes"
  DROP COLUMN "saldo_inicial",
  DROP COLUMN "desde";
