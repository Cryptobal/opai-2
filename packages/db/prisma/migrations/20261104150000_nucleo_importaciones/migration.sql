-- CAR-157 (B3) · Corridas de importación desde 1.0: registro, filas con valores previos (para revertir)
-- y marca de cierre por empresa. ADITIVA: tablas y una columna nueva; no toca datos existentes.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- Cierre de la importación: tras el corte, `aplicar` se rechaza salvo reimportación explícita del operador.
ALTER TABLE "core"."tenants" ADD COLUMN "importacion_cerrada_en" TIMESTAMPTZ(6);

CREATE TABLE "core"."importaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sistema" TEXT NOT NULL DEFAULT 'opai1',
    "origen" TEXT NOT NULL,
    "version_contrato" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "conteos" JSONB NOT NULL DEFAULT '{}',
    "lanzada_por_id" UUID,
    "iniciada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminada_en" TIMESTAMPTZ(6),
    "revertida_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."importaciones_filas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "importacion_id" UUID NOT NULL,
    "entidad" TEXT NOT NULL,
    "id_1_0" TEXT NOT NULL,
    "id_2_0" UUID,
    "accion" TEXT NOT NULL,
    "motivo" TEXT,
    -- Solo los campos que la corrida completó, con su valor anterior (nulo si estaba vacío).
    "previos" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importaciones_filas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "importaciones_tenant_id_iniciada_en_idx" ON "core"."importaciones"("tenant_id", "iniciada_en");
CREATE UNIQUE INDEX "importaciones_filas_corrida_entidad_id_key"
  ON "core"."importaciones_filas"("importacion_id", "entidad", "id_1_0");
CREATE INDEX "importaciones_filas_tenant_id_entidad_id_2_0_idx"
  ON "core"."importaciones_filas"("tenant_id", "entidad", "id_2_0");

ALTER TABLE "core"."importaciones" ADD CONSTRAINT "importaciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."importaciones_filas" ADD CONSTRAINT "importaciones_filas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."importaciones_filas" ADD CONSTRAINT "importaciones_filas_importacion_id_fkey"
  FOREIGN KEY ("importacion_id") REFERENCES "core"."importaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."importaciones" ADD CONSTRAINT "importaciones_modo_chk" CHECK ("modo" IN ('simular', 'aplicar'));
ALTER TABLE "core"."importaciones" ADD CONSTRAINT "importaciones_estado_chk"
  CHECK ("estado" IN ('en_curso', 'completada', 'fallida', 'revertida'));
ALTER TABLE "core"."importaciones_filas" ADD CONSTRAINT "importaciones_filas_accion_chk"
  CHECK ("accion" IN ('creado', 'completado', 'sin_cambio', 'omitido'));

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

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."importaciones_filas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('importacion_id', 'core.importaciones');

COMMIT;

-- Reversión (manual, rol propietario):
--   DROP TABLE "core"."importaciones_filas";
--   DROP TABLE "core"."importaciones";
--   ALTER TABLE "core"."tenants" DROP COLUMN "importacion_cerrada_en";
