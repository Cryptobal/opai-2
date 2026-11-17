-- Qué hace y por qué: CAR-99 — agrega el tipo mensual F30-1 al calendario de obligaciones de nómina.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "nomina"."obligaciones" DROP CONSTRAINT IF EXISTS "obligaciones_tipo_check";
ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_tipo_check"
  CHECK ("tipo" IN ('lre', 'previred', 'f30_1', 'f29_retencion', 'dj_sueldos', 'certificado_sueldos'));

COMMIT;

-- Reversión: quitar f30_1 del CHECK (solo si no hay obligaciones de ese tipo; si hay, restaurar desde snapshot Neon).
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE "nomina"."obligaciones" DROP CONSTRAINT IF EXISTS "obligaciones_tipo_check";
-- ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_tipo_check"
--   CHECK ("tipo" IN ('lre', 'previred', 'f29_retencion', 'dj_sueldos', 'certificado_sueldos'));
-- COMMIT;