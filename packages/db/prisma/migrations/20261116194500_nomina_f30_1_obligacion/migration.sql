-- CAR-99: obligación mensual F30-1 en el calendario de nómina.
ALTER TABLE "nomina"."obligaciones" DROP CONSTRAINT IF EXISTS "obligaciones_tipo_check";
ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_tipo_check"
  CHECK ("tipo" IN ('lre', 'previred', 'f30_1', 'f29_retencion', 'dj_sueldos', 'certificado_sueldos'));