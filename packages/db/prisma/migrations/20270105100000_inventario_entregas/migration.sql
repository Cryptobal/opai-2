-- Inventario · CAR-238 (ADR-116): entregas a personas e instalaciones. Migración aditiva, sin datos:
-- tabla nueva `inventario.entregas`.
-- Qué hace y por qué: cada activo o unidad de ropa que se entrega queda a nombre de una persona o de
-- una instalación, con fecha de entrega y, al devolverse, fecha y nota de devolución. Un activo tiene
-- a lo más una entrega abierta. Las referencias a personas e instalaciones se validan de la MISMA
-- empresa con el trigger `core.verificar_mismo_tenant`; activo y tipo, con FK compuestas por empresa.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "inventario"."entregas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "activo_id" UUID,
    "tipo_id" UUID,
    "talla" TEXT,
    "cantidad" INTEGER,
    "persona_id" UUID,
    "instalacion_id" UUID,
    "nota" TEXT,
    "entregada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devuelta_en" TIMESTAMPTZ(6),
    "nota_devolucion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id"),
    -- Un activo, o unidades de una talla de ropa (R21).
    CONSTRAINT "entregas_item_check" CHECK (
      ("activo_id" IS NOT NULL AND "tipo_id" IS NULL AND "talla" IS NULL AND "cantidad" IS NULL)
      OR ("activo_id" IS NULL AND "tipo_id" IS NOT NULL AND "talla" IS NOT NULL AND "cantidad" > 0)
    ),
    -- A una persona o a una instalación, nunca a las dos (R19).
    CONSTRAINT "entregas_destino_check" CHECK (("persona_id" IS NULL) <> ("instalacion_id" IS NULL)),
    CONSTRAINT "entregas_devolucion_check" CHECK ("devuelta_en" IS NULL OR "devuelta_en" >= "entregada_en")
);

CREATE INDEX "entregas_tenant_id_persona_id_idx" ON "inventario"."entregas"("tenant_id", "persona_id");
CREATE INDEX "entregas_tenant_id_instalacion_id_idx" ON "inventario"."entregas"("tenant_id", "instalacion_id");
CREATE INDEX "entregas_tenant_id_activo_id_idx" ON "inventario"."entregas"("tenant_id", "activo_id");
-- R20: a lo más una entrega abierta por activo.
CREATE UNIQUE INDEX "entregas_activo_abierta_key" ON "inventario"."entregas"("tenant_id", "activo_id")
  WHERE "activo_id" IS NOT NULL AND "devuelta_en" IS NULL;

ALTER TABLE "inventario"."entregas" ADD CONSTRAINT "entregas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."entregas" ADD CONSTRAINT "entregas_tenant_id_activo_id_fkey"
  FOREIGN KEY ("tenant_id", "activo_id") REFERENCES "inventario"."activos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."entregas" ADD CONSTRAINT "entregas_tenant_id_tipo_id_fkey"
  FOREIGN KEY ("tenant_id", "tipo_id") REFERENCES "inventario"."tipos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."entregas" ADD CONSTRAINT "entregas_tenant_id_persona_id_fkey"
  FOREIGN KEY ("tenant_id", "persona_id") REFERENCES "core"."personas"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."entregas" ADD CONSTRAINT "entregas_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "inventario"."entregas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

ALTER TABLE "inventario"."entregas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventario"."entregas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventario"."entregas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON "inventario"."entregas" TO opai_app;
REVOKE DELETE ON "inventario"."entregas" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "inventario"."entregas";
