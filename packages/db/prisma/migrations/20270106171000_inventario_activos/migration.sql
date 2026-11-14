-- Inventario · CAR-236 (ADR-116): activos por unidad. Migración aditiva, sin datos: tabla nueva
-- `inventario.activos`.
-- Qué hace y por qué: cada teléfono, radio o linterna de la empresa queda registrado con su código
-- interno (único por empresa), su número de serie y los valores de los campos propios de su tipo.
-- Un activo nunca se borra: se da de baja con motivo.
-- FK compuesta por empresa hacia inventario.tipos: un activo solo cuelga de un tipo de la MISMA empresa.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "inventario"."activos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigo_normalizado" TEXT NOT NULL,
    "numero_serie" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "valores" JSONB NOT NULL DEFAULT '{}',
    "notas" TEXT,
    "baja_en" TIMESTAMPTZ(6),
    "motivo_baja" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activos_estado_check" CHECK ("estado" IN ('disponible', 'asignado', 'en_reparacion', 'de_baja')),
    CONSTRAINT "activos_codigo_check" CHECK (char_length("codigo") BETWEEN 1 AND 40),
    CONSTRAINT "activos_valores_check" CHECK (jsonb_typeof("valores") = 'object'),
    CONSTRAINT "activos_baja_check" CHECK (
      ("estado" = 'de_baja') = ("baja_en" IS NOT NULL AND "motivo_baja" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "activos_tenant_id_codigo_normalizado_key"
  ON "inventario"."activos"("tenant_id", "codigo_normalizado");
CREATE UNIQUE INDEX "activos_tenant_id_id_key" ON "inventario"."activos"("tenant_id", "id");
CREATE INDEX "activos_tenant_id_tipo_id_idx" ON "inventario"."activos"("tenant_id", "tipo_id");

ALTER TABLE "inventario"."activos" ADD CONSTRAINT "activos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."activos" ADD CONSTRAINT "activos_tenant_id_tipo_id_fkey"
  FOREIGN KEY ("tenant_id", "tipo_id") REFERENCES "inventario"."tipos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventario"."activos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventario"."activos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventario"."activos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON "inventario"."activos" TO opai_app;
-- Un activo nunca se borra (R12): se da de baja con motivo.
REVOKE DELETE ON "inventario"."activos" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "inventario"."activos";
