-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-393 parte 3. Agrega la clase de la ausencia (catálogo de la empresa o de su vertical, ligado
-- al tipo base) en el registro de la persona y en las excepciones de la pauta, que la copian para mostrarla.
-- Aditiva y nullable: los registros previos quedan sin clase. No crea tablas ni toca datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."ausencias" ADD COLUMN "clase" TEXT;
ALTER TABLE "core"."ausencias"
  ADD CONSTRAINT "ausencias_clase_largo" CHECK ("clase" IS NULL OR char_length("clase") BETWEEN 3 AND 80);

ALTER TABLE "pauta"."excepciones" ADD COLUMN "clase" TEXT;
ALTER TABLE "pauta"."excepciones"
  ADD CONSTRAINT "excepciones_clase_largo" CHECK ("clase" IS NULL OR char_length("clase") BETWEEN 3 AND 80);

COMMIT;

-- Reversión: ALTER TABLE "pauta"."excepciones" DROP COLUMN "clase"; ALTER TABLE "core"."ausencias" DROP COLUMN "clase";
-- (las restricciones caen con su columna).
