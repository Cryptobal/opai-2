-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-394. El flujo de caja parte del saldo del banco (adenda de ADR-073); se
-- retiran el saldo inicial manual y la semana de partida de los ajustes, que desde CAR-391 ya no
-- entran en el cálculo. Destructiva: autorizada por Carlos el 13-nov-2026, con snapshot previo de Neon.
-- El CHECK flujo_ajustes_desde_lunes_check cae junto con la columna.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_ajustes"
  DROP COLUMN "saldo_inicial",
  DROP COLUMN "desde";

COMMIT;

-- Reversión: los valores no se pueden reconstruir con SQL; se restauran desde el snapshot de Neon
-- tomado antes de aplicar. Solo la estructura: ALTER TABLE "finanzas"."flujo_ajustes"
-- ADD COLUMN "saldo_inicial" BIGINT NOT NULL DEFAULT 0, ADD COLUMN "desde" DATE.
