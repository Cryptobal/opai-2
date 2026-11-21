-- CAR-606: el canal `enlace_publico` en marcas (complementa codigos_marcacion_publica sin tocar esa migración).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "asistencia"."marcas" DROP CONSTRAINT "marcas_canal_chk";
ALTER TABLE "asistencia"."marcas"
  ADD CONSTRAINT "marcas_canal_chk"
  CHECK ("canal" IS NULL OR "canal" IN ('kiosco', 'telefono_personal', 'enlace_publico'));

COMMIT;

-- Reversión (manual, con el rol propietario, tras desplegar el código anterior; o restaurar snapshot de Neon):
-- ALTER TABLE "asistencia"."marcas" DROP CONSTRAINT "marcas_canal_chk";
-- ALTER TABLE "asistencia"."marcas"
--   ADD CONSTRAINT "marcas_canal_chk"
--   CHECK ("canal" IS NULL OR "canal" IN ('kiosco', 'telefono_personal'));