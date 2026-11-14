-- CAR-393 parte 3: clase de la ausencia (catálogo por empresa o por vertical, ligado al tipo base). Aditiva y nullable:
-- los registros previos quedan sin clase. La pauta la copia en sus excepciones para mostrarla sin unir con el registro.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."ausencias" ADD COLUMN "clase" TEXT;
ALTER TABLE "core"."ausencias"
  ADD CONSTRAINT "ausencias_clase_largo" CHECK ("clase" IS NULL OR char_length("clase") BETWEEN 3 AND 80);

ALTER TABLE "pauta"."excepciones" ADD COLUMN "clase" TEXT;
ALTER TABLE "pauta"."excepciones"
  ADD CONSTRAINT "excepciones_clase_largo" CHECK ("clase" IS NULL OR char_length("clase") BETWEEN 3 AND 80);
