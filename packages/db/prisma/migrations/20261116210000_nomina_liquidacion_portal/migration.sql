-- CAR-99 · publicar liquidación al portal del trabajador: vínculo al PDF en core.documentos y marca de publicación.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "nomina"."liquidaciones"
  ADD COLUMN "documento_id" UUID,
  ADD COLUMN "publicada_en" TIMESTAMPTZ(6);

ALTER TABLE "nomina"."liquidaciones" ADD CONSTRAINT "liquidaciones_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "core"."documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "liquidaciones_documento_id_idx" ON "nomina"."liquidaciones" ("documento_id");

DROP TRIGGER IF EXISTS mismo_tenant ON "nomina"."liquidaciones";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."liquidaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'periodo_id', 'nomina.periodos',
    'persona_id', 'core.personas',
    'capa_id', 'core.estructuras_sueldo',
    'documento_id', 'core.documentos');

COMMIT;

-- Reversión: DROP INDEX; DROP CONSTRAINT; DROP TRIGGER; recrear trigger sin documento_id; DROP COLUMN documento_id, publicada_en;