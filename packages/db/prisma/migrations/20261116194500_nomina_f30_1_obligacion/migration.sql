-- CAR-99: obligación mensual F30-1 en el calendario de nómina.
-- Qué hace y por qué: amplía obligaciones_tipo_check con 'f30_1' (certificado F30-1).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "nomina"."obligaciones" DROP CONSTRAINT IF EXISTS "obligaciones_tipo_check";
ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_tipo_check"
  CHECK ("tipo" IN ('lre', 'previred', 'f30_1', 'f29_retencion', 'dj_sueldos', 'certificado_sueldos'));

COMMIT;

-- Reversión: quitar filas f30_1 y restaurar el CHECK sin ese valor:
--   DELETE FROM "nomina"."obligaciones" WHERE "tipo" = 'f30_1';
--   ALTER TABLE "nomina"."obligaciones" DROP CONSTRAINT IF EXISTS "obligaciones_tipo_check";
--   ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_tipo_check"
--     CHECK ("tipo" IN ('lre', 'previred', 'f29_retencion', 'dj_sueldos', 'certificado_sueldos'));