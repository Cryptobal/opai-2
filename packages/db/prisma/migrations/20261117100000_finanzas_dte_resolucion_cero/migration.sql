-- CAR-240 · La resolución SII N° 0 es válida en certificación (el SII la usa para el ambiente de pruebas).
-- El CHECK de CAR-154 exigía N° >= 1 y la capacidad `finanzas.dte_config.actualizar` acepta 0: al guardar SimpleAPI con
-- N° 0, el upsert chocaba contra el CHECK y no se guardaba nada. Esta migración solo ENSANCHA el rango permitido a
-- 0..999999: no toca filas ni columnas, y toda fila que cumplía el CHECK anterior cumple el nuevo. La regla de que el 0
-- no vale en producción sigue en la capacidad.
-- Tablas con tenant_id: no se crean tablas (dte_config ya tiene RLS + FORCE + tenant_isolation).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_config" DROP CONSTRAINT IF EXISTS "dte_config_resolucion_sii_numero_chk";
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_resolucion_sii_numero_chk"
  CHECK ("resolucion_sii_numero" IS NULL OR ("resolucion_sii_numero" >= 0 AND "resolucion_sii_numero" <= 999999));

COMMIT;

-- Reversión: si ninguna fila tiene resolucion_sii_numero = 0, restaurar el CHECK anterior:
--   ALTER TABLE "finanzas"."dte_config" DROP CONSTRAINT IF EXISTS "dte_config_resolucion_sii_numero_chk";
--   ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_resolucion_sii_numero_chk"
--     CHECK ("resolucion_sii_numero" IS NULL OR ("resolucion_sii_numero" >= 1 AND "resolucion_sii_numero" <= 999999));
-- Si ya hay filas con 0 (configuraciones de certificación), la reversión las rechazaría: restaurar desde el snapshot.
