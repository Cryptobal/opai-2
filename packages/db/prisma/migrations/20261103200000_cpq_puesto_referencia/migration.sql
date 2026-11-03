-- CAR-162 · CPQ v4 parte 1: sueldo de referencia por cargo, hoja de puesto completa y parámetros
-- financieros por versión. Solo cambios aditivos: columnas nulas o con defecto y una tabla nueva.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
-- Sin migración de datos: las líneas y versiones existentes quedan con nulos (= defecto del tenant).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "cargo_id" UUID;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "dias_semana" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "sueldo_origen" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "sueldo_modo" TEXT NOT NULL DEFAULT 'bruto';
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "liquido_objetivo_clp" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "colacion_clp" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "movilizacion_clp" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "afp" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "salud_tipo" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "salud_plan_uf" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "tipo_contrato" TEXT;
ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_cargo_id_fkey" FOREIGN KEY ("cargo_id")
  REFERENCES "core"."cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "lineas_tenant_id_cargo_id_idx" ON "cpq"."lineas"("tenant_id", "cargo_id");

-- El cargo de la línea es del mismo tenant: se agrega al trigger existente (antes solo seccion_id).
DROP TRIGGER IF EXISTS mismo_tenant ON "cpq"."lineas";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."lineas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'seccion_id', 'cpq.secciones', 'cargo_id', 'core.cargos');

ALTER TABLE "cpq"."versiones" ADD COLUMN IF NOT EXISTS "instrumentos_json" TEXT;
ALTER TABLE "cpq"."versiones" ADD COLUMN IF NOT EXISTS "meses_contrato" INTEGER;

CREATE TABLE "cpq"."sueldos_referencia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "sueldo_base_clp" INTEGER NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "sueldos_referencia_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sueldos_referencia_sueldo_check" CHECK ("sueldo_base_clp" >= 0)
);
CREATE UNIQUE INDEX "sueldos_referencia_tenant_id_cargo_id_vigente_desde_key"
  ON "cpq"."sueldos_referencia"("tenant_id", "cargo_id", "vigente_desde");
CREATE INDEX "sueldos_referencia_tenant_id_cargo_id_idx" ON "cpq"."sueldos_referencia"("tenant_id", "cargo_id");
ALTER TABLE "cpq"."sueldos_referencia" ADD CONSTRAINT "sueldos_referencia_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."sueldos_referencia" ADD CONSTRAINT "sueldos_referencia_cargo_id_fkey"
  FOREIGN KEY ("cargo_id") REFERENCES "core"."cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."sueldos_referencia" ADD CONSTRAINT "sueldos_referencia_creado_por_id_fkey"
  FOREIGN KEY ("creado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON "cpq"."sueldos_referencia" TO opai_app;

ALTER TABLE "cpq"."sueldos_referencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."sueldos_referencia" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."sueldos_referencia" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."sueldos_referencia"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cargo_id', 'core.cargos');

COMMIT;

-- Reversión (rol propietario, en una transacción; antes revertir el código que escribe estas columnas):
--   DROP TABLE IF EXISTS "cpq"."sueldos_referencia";
--   ALTER TABLE "cpq"."versiones" DROP COLUMN IF EXISTS "meses_contrato", DROP COLUMN IF EXISTS "instrumentos_json";
--   DROP TRIGGER IF EXISTS mismo_tenant ON "cpq"."lineas";
--   CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."lineas"
--     FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('seccion_id', 'cpq.secciones');
--   DROP INDEX IF EXISTS "cpq"."lineas_tenant_id_cargo_id_idx";
--   ALTER TABLE "cpq"."lineas" DROP CONSTRAINT IF EXISTS "lineas_cargo_id_fkey";
--   ALTER TABLE "cpq"."lineas" DROP COLUMN IF EXISTS "cargo_id", DROP COLUMN IF EXISTS "dias_semana",
--     DROP COLUMN IF EXISTS "sueldo_origen", DROP COLUMN IF EXISTS "sueldo_modo",
--     DROP COLUMN IF EXISTS "liquido_objetivo_clp", DROP COLUMN IF EXISTS "colacion_clp",
--     DROP COLUMN IF EXISTS "movilizacion_clp", DROP COLUMN IF EXISTS "afp", DROP COLUMN IF EXISTS "salud_tipo",
--     DROP COLUMN IF EXISTS "salud_plan_uf", DROP COLUMN IF EXISTS "tipo_contrato";
