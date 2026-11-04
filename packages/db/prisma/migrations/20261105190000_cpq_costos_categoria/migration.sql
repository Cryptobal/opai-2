-- CAR-162 · Costos manuales por categoría de la cotización, de un puesto o globales (aditivo, reversible:
-- DROP TABLE "cpq"."costos_categoria"). Sin filas, el cálculo de las cotizaciones existentes no cambia.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "cpq"."costos_categoria" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "linea_id" UUID,
    "categoria" TEXT NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "costos_categoria_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "costos_categoria_monto_check" CHECK ("monto_clp" >= 0),
    CONSTRAINT "costos_categoria_categoria_check" CHECK ("categoria" <> 'feriados')
);

CREATE INDEX "costos_categoria_tenant_id_version_id_idx" ON "cpq"."costos_categoria"("tenant_id", "version_id");
-- Un solo costo por categoría y alcance: por puesto, o uno global (linea_id nulo).
CREATE UNIQUE INDEX "costos_categoria_puesto_unico" ON "cpq"."costos_categoria"("version_id", "linea_id", "categoria")
  WHERE "linea_id" IS NOT NULL;
CREATE UNIQUE INDEX "costos_categoria_global_unico" ON "cpq"."costos_categoria"("version_id", "categoria")
  WHERE "linea_id" IS NULL;

ALTER TABLE "cpq"."costos_categoria" ADD CONSTRAINT "costos_categoria_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."costos_categoria" ADD CONSTRAINT "costos_categoria_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."costos_categoria" ADD CONSTRAINT "costos_categoria_linea_id_fkey"
  FOREIGN KEY ("linea_id") REFERENCES "cpq"."lineas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cpq"."costos_categoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."costos_categoria" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."costos_categoria" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant_costo_version BEFORE INSERT OR UPDATE ON "cpq"."costos_categoria"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('version_id', 'cpq.versiones');
CREATE TRIGGER mismo_tenant_costo_linea BEFORE INSERT OR UPDATE ON "cpq"."costos_categoria"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('linea_id', 'cpq.lineas');

COMMIT;

-- Reversión: DROP TABLE "cpq"."costos_categoria"; (solo guarda costos manuales por categoría; los demás datos de la cotización no dependen de ella).
