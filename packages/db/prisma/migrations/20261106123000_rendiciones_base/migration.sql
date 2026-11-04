-- CAR-175, Rendiciones R1 (ADR-048, ADR-069): schema `rendiciones` con rendiciones de compra, sus
-- ítems, la línea de tiempo y el contador REN-n por empresa. Migración ADITIVA: solo crea objetos
-- nuevos. Toda tabla con tenant_id lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS "rendiciones";

CREATE TABLE "rendiciones"."rendiciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'compra',
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "solicitante_id" UUID NOT NULL,
    "aprobador_id" UUID,
    "centro_costo" TEXT NOT NULL,
    "instalacion_id" UUID,
    "descripcion" TEXT NOT NULL,
    "monto_total" INTEGER NOT NULL,
    "enviada_en" TIMESTAMPTZ(6),
    "decidida_en" TIMESTAMPTZ(6),
    "decidida_por_id" UUID,
    "motivo_decision" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "rendiciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rendiciones_tipo_chk" CHECK ("tipo" IN ('compra', 'kilometraje')),
    CONSTRAINT "rendiciones_estado_chk" CHECK ("estado" IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'devuelta', 'pagada', 'anulada')),
    CONSTRAINT "rendiciones_centro_chk" CHECK (("centro_costo" = 'instalacion' AND "instalacion_id" IS NOT NULL) OR ("centro_costo" = 'administracion' AND "instalacion_id" IS NULL)),
    CONSTRAINT "rendiciones_monto_chk" CHECK ("monto_total" >= 0),
    CONSTRAINT "rendiciones_nopropia_chk" CHECK ("aprobador_id" IS NULL OR "aprobador_id" <> "solicitante_id"),
    CONSTRAINT "rendiciones_decididapor_chk" CHECK ("decidida_por_id" IS NULL OR "decidida_por_id" <> "solicitante_id")
);

CREATE TABLE "rendiciones"."rendicion_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rendicion_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "proveedor" TEXT NOT NULL,
    "folio" TEXT,
    "descripcion" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "documento_id" UUID,
    "sin_respaldo_motivo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "rendicion_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rendicion_items_monto_chk" CHECK ("monto" > 0)
);

CREATE TABLE "rendiciones"."rendicion_historial" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rendicion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "estado_desde" TEXT,
    "estado_hasta" TEXT,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rendicion_historial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rendiciones"."rendicion_contadores" (
    "tenant_id" UUID NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "rendicion_contadores_pkey" PRIMARY KEY ("tenant_id")
);

CREATE UNIQUE INDEX "rendiciones_tenant_id_codigo_key" ON "rendiciones"."rendiciones"("tenant_id", "codigo");
CREATE INDEX "rendiciones_tenant_id_estado_idx" ON "rendiciones"."rendiciones"("tenant_id", "estado");
CREATE INDEX "rendiciones_tenant_id_solicitante_id_idx" ON "rendiciones"."rendiciones"("tenant_id", "solicitante_id");
CREATE INDEX "rendiciones_tenant_id_aprobador_id_estado_idx" ON "rendiciones"."rendiciones"("tenant_id", "aprobador_id", "estado");
CREATE INDEX "rendicion_items_tenant_id_rendicion_id_idx" ON "rendiciones"."rendicion_items"("tenant_id", "rendicion_id");
CREATE INDEX "rendicion_items_tenant_id_proveedor_folio_monto_idx" ON "rendiciones"."rendicion_items"("tenant_id", "proveedor", "folio", "monto");
CREATE INDEX "rendicion_historial_tenant_id_rendicion_id_idx" ON "rendiciones"."rendicion_historial"("tenant_id", "rendicion_id");

-- Claves foráneas (schema propio y core.tenants / core.users / core.instalaciones / core.documentos)
ALTER TABLE "rendiciones"."rendiciones" ADD CONSTRAINT "rendiciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendiciones" ADD CONSTRAINT "rendiciones_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendiciones" ADD CONSTRAINT "rendiciones_aprobador_id_fkey" FOREIGN KEY ("aprobador_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendiciones" ADD CONSTRAINT "rendiciones_decidida_por_id_fkey" FOREIGN KEY ("decidida_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendiciones" ADD CONSTRAINT "rendiciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_items" ADD CONSTRAINT "rendicion_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_items" ADD CONSTRAINT "rendicion_items_rendicion_id_fkey" FOREIGN KEY ("rendicion_id") REFERENCES "rendiciones"."rendiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_items" ADD CONSTRAINT "rendicion_items_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_historial" ADD CONSTRAINT "rendicion_historial_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_historial" ADD CONSTRAINT "rendicion_historial_rendicion_id_fkey" FOREIGN KEY ("rendicion_id") REFERENCES "rendiciones"."rendiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_historial" ADD CONSTRAINT "rendicion_historial_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_contadores" ADD CONSTRAINT "rendicion_contadores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT USAGE ON SCHEMA "rendiciones" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "rendiciones" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "rendiciones" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "rendiciones" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "rendiciones" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "rendiciones"."rendiciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."rendiciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."rendiciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rendiciones"."rendicion_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."rendicion_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."rendicion_items" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rendiciones"."rendicion_historial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."rendicion_historial" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."rendicion_historial" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rendiciones"."rendicion_contadores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."rendicion_contadores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."rendicion_contadores" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (core.users no lleva tenant_id: identidad global, ADR-015).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rendiciones"."rendiciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rendiciones"."rendicion_items"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('rendicion_id', 'rendiciones.rendiciones', 'documento_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rendiciones"."rendicion_historial"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('rendicion_id', 'rendiciones.rendiciones');

COMMIT;
