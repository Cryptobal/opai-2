-- CAR-127 · Documentos v4, pantalla 05 «Plantillas» (decisiones de Carlos del 9-nov-2026).
-- Plantillas laborales con versiones. ADITIVA: dos tablas nuevas en `core`, no toca ninguna
-- existente. Las salidas comerciales siguen en CPQ. El contenido es texto con variables
-- `{persona.rut}` (la validación contra el catálogo vive en la capacidad y en `@opai/domain`).
--
-- Las tablas se crean después de force_rls (20261028170000): llevan ENABLE + FORCE ROW LEVEL
-- SECURITY y la política `tenant_isolation` para opai_app. Nada de datos que migrar: no hay
-- UPDATE/DELETE, así que el aviso de REGLAS-codigo sobre filas afectadas no aplica.
--
-- Reversión (manual; solo si no hay plantillas que conservar):
--   DROP TABLE "core"."documento_plantilla_versiones"; DROP TABLE "core"."documento_plantillas";
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "core"."documento_plantillas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "nivel_firma" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'creada',
    "version_vigente" INTEGER NOT NULL DEFAULT 1,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documento_plantillas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documento_plantillas_clase_check"
      CHECK ("clase" IN ('contrato_trabajo', 'anexo_contrato', 'recepcion_laboral', 'carta_trabajador')),
    CONSTRAINT "documento_plantillas_nivel_firma_check" CHECK ("nivel_firma" IN ('N1', 'N2')),
    CONSTRAINT "documento_plantillas_origen_check" CHECK ("origen" IN ('creada', 'word', 'pdf')),
    CONSTRAINT "documento_plantillas_version_vigente_check" CHECK ("version_vigente" >= 1)
);

CREATE TABLE IF NOT EXISTS "core"."documento_plantilla_versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plantilla_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "creado_por_id" UUID,
    "creado_por_nombre" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_plantilla_versiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documento_plantilla_versiones_numero_check" CHECK ("numero" >= 1),
    CONSTRAINT "documento_plantilla_versiones_contenido_check"
      CHECK (char_length("contenido") <= 100000)
);

CREATE UNIQUE INDEX IF NOT EXISTS "documento_plantillas_tenant_id_nombre_key"
  ON "core"."documento_plantillas"("tenant_id", "nombre");
CREATE INDEX IF NOT EXISTS "documento_plantillas_tenant_id_clase_idx"
  ON "core"."documento_plantillas"("tenant_id", "clase");
CREATE UNIQUE INDEX IF NOT EXISTS "documento_plantilla_versiones_plantilla_id_numero_key"
  ON "core"."documento_plantilla_versiones"("plantilla_id", "numero");
CREATE INDEX IF NOT EXISTS "documento_plantilla_versiones_tenant_id_plantilla_id_idx"
  ON "core"."documento_plantilla_versiones"("tenant_id", "plantilla_id");

DO $$ BEGIN
  ALTER TABLE "core"."documento_plantillas" ADD CONSTRAINT "documento_plantillas_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ALTER TABLE "core"."documento_plantilla_versiones" ADD CONSTRAINT "documento_plantilla_versiones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ALTER TABLE "core"."documento_plantilla_versiones" ADD CONSTRAINT "documento_plantilla_versiones_plantilla_id_fkey"
    FOREIGN KEY ("plantilla_id") REFERENCES "core"."documento_plantillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: aislamiento por tenant (plantilla de REGLAS-codigo.md). CI falla si falta (rls-nucleo*.test).
ALTER TABLE "core"."documento_plantillas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."documento_plantillas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."documento_plantillas";
CREATE POLICY tenant_isolation ON "core"."documento_plantillas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."documento_plantilla_versiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."documento_plantilla_versiones" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."documento_plantilla_versiones";
CREATE POLICY tenant_isolation ON "core"."documento_plantilla_versiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La versión debe ser del mismo tenant que su plantilla.
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."documento_plantilla_versiones";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."documento_plantilla_versiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'plantilla_id', 'core.documento_plantillas');

-- Las versiones son inmutables (el contenido firmado/generado debe poder reconstruirse): editar crea
-- la siguiente; opai_app no puede modificar ni borrar una versión ya creada.
REVOKE UPDATE, DELETE ON "core"."documento_plantilla_versiones" FROM opai_app;

COMMIT;
