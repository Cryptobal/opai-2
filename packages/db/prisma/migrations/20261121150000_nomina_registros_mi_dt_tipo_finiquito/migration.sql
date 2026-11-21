-- CAR-741 · Cumplimiento DT: el CHECK de registros_mi_dt debe aceptar finiquitos (el código ya los usa).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "nomina"."registros_mi_dt" DROP CONSTRAINT "registros_mi_dt_tipo_check";
ALTER TABLE "nomina"."registros_mi_dt"
  ADD CONSTRAINT "registros_mi_dt_tipo_check"
  CHECK ("movimiento_tipo" IN ('alta', 'baja', 'anexo', 'finiquito'));

COMMIT;

-- Reversión:
-- ALTER TABLE "nomina"."registros_mi_dt" DROP CONSTRAINT "registros_mi_dt_tipo_check";
-- ALTER TABLE "nomina"."registros_mi_dt"
--   ADD CONSTRAINT "registros_mi_dt_tipo_check"
--   CHECK ("movimiento_tipo" IN ('alta', 'baja', 'anexo'));