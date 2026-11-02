-- CAR-135 addendum · marca y plantillas documentales CPQ (aditivo, reversible).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "cpq"."versiones" ADD COLUMN IF NOT EXISTS "marca_documento_version" INTEGER;
ALTER TABLE "cpq"."versiones" ADD COLUMN IF NOT EXISTS "plantilla_documento_id" UUID;
ALTER TABLE "cpq"."versiones" ADD COLUMN IF NOT EXISTS "plantilla_documento_version" INTEGER;

CREATE TABLE "cpq"."marca_documento" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tipografia" TEXT NOT NULL DEFAULT 'inter',
    "pie_pagina" TEXT,
    "condiciones_default" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marca_documento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marca_documento_tipografia_check" CHECK ("tipografia" IN ('inter', 'helvetica', 'times'))
);

CREATE UNIQUE INDEX "marca_documento_tenant_id_key" ON "cpq"."marca_documento"("tenant_id");

CREATE TABLE "cpq"."marca_documento_revisiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "marca_documento_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "tipografia" TEXT NOT NULL,
    "pie_pagina" TEXT,
    "condiciones_default" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marca_documento_revisiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marca_documento_revisiones_marca_documento_id_version_key" UNIQUE ("marca_documento_id", "version")
);

CREATE TABLE "cpq"."plantillas_documento" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'cotizacion',
    "base" TEXT NOT NULL DEFAULT 'clasica',
    "bloques_json" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plantillas_documento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plantillas_documento_tipo_check" CHECK ("tipo" IN ('cotizacion')),
    CONSTRAINT "plantillas_documento_base_check" CHECK ("base" IN ('clasica', 'ejecutiva', 'compacta'))
);

CREATE INDEX "plantillas_documento_tenant_id_tipo_idx" ON "cpq"."plantillas_documento"("tenant_id", "tipo");
CREATE UNIQUE INDEX "plantillas_documento_una_activa_cotizacion" ON "cpq"."plantillas_documento"("tenant_id", "tipo")
  WHERE "activa" AND "tipo" = 'cotizacion';

CREATE TABLE "cpq"."plantillas_documento_revisiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plantilla_documento_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "base" TEXT NOT NULL,
    "bloques_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantillas_documento_revisiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plantillas_documento_revisiones_plantilla_documento_id_version_key" UNIQUE ("plantilla_documento_id", "version")
);

ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_plantilla_documento_id_fkey"
  FOREIGN KEY ("plantilla_documento_id") REFERENCES "cpq"."plantillas_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cpq"."marca_documento" ADD CONSTRAINT "marca_documento_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."marca_documento_revisiones" ADD CONSTRAINT "marca_documento_revisiones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."marca_documento_revisiones" ADD CONSTRAINT "marca_documento_revisiones_marca_documento_id_fkey"
  FOREIGN KEY ("marca_documento_id") REFERENCES "cpq"."marca_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."plantillas_documento" ADD CONSTRAINT "plantillas_documento_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."plantillas_documento_revisiones" ADD CONSTRAINT "plantillas_documento_revisiones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."plantillas_documento_revisiones" ADD CONSTRAINT "plantillas_documento_revisiones_plantilla_documento_id_fkey"
  FOREIGN KEY ("plantilla_documento_id") REFERENCES "cpq"."plantillas_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cpq"."marca_documento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."marca_documento" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."marca_documento" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."marca_documento_revisiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."marca_documento_revisiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."marca_documento_revisiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."plantillas_documento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."plantillas_documento" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."plantillas_documento" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."plantillas_documento_revisiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."plantillas_documento_revisiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."plantillas_documento_revisiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."marca_documento_revisiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('marca_documento_id', 'cpq.marca_documento');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."plantillas_documento_revisiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('plantilla_documento_id', 'cpq.plantillas_documento');

COMMIT;

-- Reversión manual (rol propietario):
-- ALTER TABLE "cpq"."versiones" DROP CONSTRAINT IF EXISTS "versiones_plantilla_documento_id_fkey";
-- ALTER TABLE "cpq"."versiones" DROP COLUMN IF EXISTS "marca_documento_version", DROP COLUMN IF EXISTS "plantilla_documento_id", DROP COLUMN IF EXISTS "plantilla_documento_version";
-- DROP TABLE IF EXISTS "cpq"."plantillas_documento_revisiones";
-- DROP TABLE IF EXISTS "cpq"."plantillas_documento";
-- DROP TABLE IF EXISTS "cpq"."marca_documento_revisiones";
-- DROP TABLE IF EXISTS "cpq"."marca_documento";
