-- CAR-119, Brief 10 · PR 10.1: schema `cpq` con cotizaciones (código CPQ-AAAA-NNN), versiones (estados
-- R40), secciones, líneas, aprobaciones y el correlativo por tenant y año. Migración ADITIVA: solo crea
-- objetos nuevos, sin DROP ni cambios en tablas existentes. Toda tabla con tenant_id lleva RLS
-- `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS. Sin cálculo todavía: venta,
-- costos y líneas con precio llegan con el motor (Brief 08).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cpq";

-- CreateTable
CREATE TABLE "cpq"."cotizaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "negocio_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "alternativa_de_id" UUID,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpq"."versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "moneda" TEXT NOT NULL DEFAULT 'CLP',
    "valida_hasta" DATE,
    "margen_modo" TEXT NOT NULL DEFAULT 'margen_sobre_venta',
    "margen_objetivo_pct" INTEGER,
    "venta_mensual_clp" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "enviada_en" TIMESTAMPTZ(6),
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "versiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "versiones_estado_check" CHECK ("estado" IN
      ('borrador', 'en_aprobacion', 'lista', 'enviada', 'aceptada', 'rechazada', 'vencida', 'reemplazada', 'archivada')),
    CONSTRAINT "versiones_moneda_check" CHECK ("moneda" IN ('CLP', 'UF')),
    CONSTRAINT "versiones_margen_modo_check" CHECK ("margen_modo" IN
      ('margen_sobre_venta', 'markup', 'margen_sobre_mano_de_obra')),
    CONSTRAINT "versiones_numero_check" CHECK ("numero" >= 1)
);

CREATE TABLE "cpq"."secciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpq"."lineas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seccion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "grupo" TEXT,
    "nombre" TEXT NOT NULL,
    "posiciones" INTEGER NOT NULL DEFAULT 1,
    "recurrencia" TEXT NOT NULL DEFAULT 'mensual',
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "visible_cliente" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lineas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lineas_tipo_check" CHECK ("tipo" IN ('puesto', 'item', 'adicional')),
    CONSTRAINT "lineas_recurrencia_check" CHECK ("recurrencia" IN ('mensual', 'unico')),
    CONSTRAINT "lineas_posiciones_check" CHECK ("posiciones" >= 1)
);

CREATE TABLE "cpq"."aprobaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "solicitada_por_id" UUID NOT NULL,
    "comentario" TEXT,
    "decidida_por_id" UUID,
    "motivo" TEXT,
    "decidida_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aprobaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "aprobaciones_estado_check" CHECK ("estado" IN ('pendiente', 'aprobada', 'rechazada', 'retirada'))
);

CREATE TABLE "cpq"."correlativos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "correlativos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "correlativos_ultimo_check" CHECK ("ultimo" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_tenant_id_codigo_key" ON "cpq"."cotizaciones"("tenant_id", "codigo");
CREATE INDEX "cotizaciones_tenant_id_negocio_id_idx" ON "cpq"."cotizaciones"("tenant_id", "negocio_id");
-- Una sola cotización vigente por negocio (R46).
CREATE UNIQUE INDEX "cotizaciones_una_vigente_por_negocio" ON "cpq"."cotizaciones"("tenant_id", "negocio_id") WHERE "vigente";

CREATE UNIQUE INDEX "versiones_cotizacion_id_numero_key" ON "cpq"."versiones"("cotizacion_id", "numero");
CREATE INDEX "versiones_tenant_id_cotizacion_id_idx" ON "cpq"."versiones"("tenant_id", "cotizacion_id");
CREATE INDEX "versiones_tenant_id_estado_idx" ON "cpq"."versiones"("tenant_id", "estado");
-- Una sola versión editable por cotización (cpq.md §2): enviar la congela y recién entonces nace la siguiente.
CREATE UNIQUE INDEX "versiones_una_editable_por_cotizacion" ON "cpq"."versiones"("cotizacion_id")
  WHERE "estado" IN ('borrador', 'en_aprobacion', 'lista');

CREATE INDEX "secciones_tenant_id_version_id_idx" ON "cpq"."secciones"("tenant_id", "version_id");
CREATE INDEX "lineas_tenant_id_seccion_id_idx" ON "cpq"."lineas"("tenant_id", "seccion_id");
CREATE INDEX "aprobaciones_tenant_id_version_id_idx" ON "cpq"."aprobaciones"("tenant_id", "version_id");
CREATE UNIQUE INDEX "correlativos_tenant_id_anio_key" ON "cpq"."correlativos"("tenant_id", "anio");

-- AddForeignKey (schema propio, core.tenants/core.users/core.instalaciones y comercial.negocios; sin
-- tocar tablas de otros módulos)
ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_alternativa_de_id_fkey" FOREIGN KEY ("alternativa_de_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "cpq"."secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_solicitada_por_id_fkey" FOREIGN KEY ("solicitada_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_decidida_por_id_fkey" FOREIGN KEY ("decidida_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."correlativos" ADD CONSTRAINT "correlativos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Grants (GRANT USAGE + ALTER DEFAULT PRIVILEGES al crear un schema nuevo, ver REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "cpq" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "cpq" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "cpq" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "cpq" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "cpq" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "cpq"."cotizaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."cotizaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."cotizaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."versiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."versiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."versiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."secciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."secciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."secciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."lineas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."lineas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."lineas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."aprobaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."aprobaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."aprobaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."correlativos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."correlativos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."correlativos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`); los FK a
-- core.users no llevan este trigger porque users no tiene tenant_id (identidad global, ADR-015).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."cotizaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'negocio_id', 'comercial.negocios', 'alternativa_de_id', 'cpq.cotizaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."versiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cotizacion_id', 'cpq.cotizaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."secciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'version_id', 'cpq.versiones', 'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."lineas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('seccion_id', 'cpq.secciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."aprobaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('version_id', 'cpq.versiones');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): sin datos de negocio que migrar
-- (el schema es nuevo), basta con:
--   DROP SCHEMA "cpq" CASCADE;
-- Elimina las 6 tablas, sus índices, FKs, triggers y la política tenant_isolation de cada una, y
-- revoca los GRANT/ALTER DEFAULT PRIVILEGES sobre el schema al desaparecer. Exige haber revertido
-- antes el código del módulo (manifest y capacidades `cpq.*`) para que nada siga escribiendo ahí.
