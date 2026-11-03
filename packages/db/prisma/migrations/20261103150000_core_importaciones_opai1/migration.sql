-- Brief B3 · corridas de importación OPAI 1.0 (core.importaciones + filas). Etiqueta migracion-pendiente.

ALTER TABLE "core"."tenants" ADD COLUMN "importacion_cerrada_en" TIMESTAMPTZ(6);

CREATE TABLE "core"."importaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "origen" TEXT NOT NULL,
    "contrato_version" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "conteos" JSONB NOT NULL DEFAULT '{}',
    "lanzado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."importaciones_filas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "importacion_id" UUID NOT NULL,
    "entidad" TEXT NOT NULL,
    "id_opai_1" TEXT NOT NULL,
    "id_opai_2" UUID,
    "accion" TEXT NOT NULL,
    "valores_previos" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importaciones_filas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "importaciones_tenant_id_created_at_idx" ON "core"."importaciones"("tenant_id", "created_at");
CREATE INDEX "importaciones_filas_tenant_id_importacion_id_idx" ON "core"."importaciones_filas"("tenant_id", "importacion_id");
CREATE INDEX "importaciones_filas_tenant_id_entidad_id_opai_1_idx" ON "core"."importaciones_filas"("tenant_id", "entidad", "id_opai_1");

ALTER TABLE "core"."importaciones" ADD CONSTRAINT "importaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."importaciones_filas" ADD CONSTRAINT "importaciones_filas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."importaciones_filas" ADD CONSTRAINT "importaciones_filas_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "core"."importaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."importaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."importaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."importaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."importaciones_filas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."importaciones_filas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."importaciones_filas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
