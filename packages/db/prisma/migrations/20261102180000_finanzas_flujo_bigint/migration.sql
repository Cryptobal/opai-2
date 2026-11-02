-- CAR-139 · Flujo de caja PR 3: montos del flujo a BIGINT (paridad 1.0 / R-FIN-035).
-- Sin pérdida (INTEGER cabe en BIGINT). CHECK flujo_celdas_monto_check (monto >= 0) intacto.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_celdas"
  ALTER COLUMN "monto" TYPE BIGINT;

ALTER TABLE "finanzas"."flujo_cierres"
  ALTER COLUMN "saldo_sugerido" TYPE BIGINT,
  ALTER COLUMN "saldo_banco" TYPE BIGINT;

ALTER TABLE "finanzas"."flujo_ajustes"
  ALTER COLUMN "saldo_inicial" TYPE BIGINT,
  ALTER COLUMN "umbral" TYPE BIGINT,
  ALTER COLUMN "tolerancia_cierre" TYPE BIGINT;

COMMIT;

-- Reversión (solo con respaldo previo; ejecutar el SELECT antes de ALTER TYPE INTEGER):
-- DO $$ BEGIN
--   IF EXISTS (
--     SELECT 1 FROM "finanzas"."flujo_celdas"
--     WHERE "monto" > 2147483647 OR "monto" < -2147483647
--   ) OR EXISTS (
--     SELECT 1 FROM "finanzas"."flujo_cierres"
--     WHERE "saldo_sugerido" > 2147483647 OR "saldo_sugerido" < -2147483647
--       OR "saldo_banco" > 2147483647 OR "saldo_banco" < -2147483647
--   ) OR EXISTS (
--     SELECT 1 FROM "finanzas"."flujo_ajustes"
--     WHERE "saldo_inicial" > 2147483647 OR "saldo_inicial" < -2147483647
--       OR "umbral" > 2147483647 OR "umbral" < -2147483647
--       OR "tolerancia_cierre" > 2147483647
--   ) THEN
--     RAISE EXCEPTION 'Hay montos del flujo fuera de ±2.147.483.647; no se puede revertir a INTEGER.';
--   END IF;
-- END $$;
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE "finanzas"."flujo_celdas" ALTER COLUMN "monto" TYPE INTEGER;
-- ALTER TABLE "finanzas"."flujo_cierres"
--   ALTER COLUMN "saldo_sugerido" TYPE INTEGER,
--   ALTER COLUMN "saldo_banco" TYPE INTEGER;
-- ALTER TABLE "finanzas"."flujo_ajustes"
--   ALTER COLUMN "saldo_inicial" TYPE INTEGER,
--   ALTER COLUMN "umbral" TYPE INTEGER,
--   ALTER COLUMN "tolerancia_cierre" TYPE INTEGER;
-- COMMIT;
