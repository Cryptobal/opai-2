-- Brief 07 · PR 1 — Comercial: Negocios y Contactos (ADR-040). Schema propio `comercial`.
-- Toda tabla con tenant_id: RLS `tenant_isolation` para opai_app (NOBYPASSRLS). La FK de tenant_id
-- a core.tenants va aquí (los modelos no llevan @relation a Tenant). Referencias al mismo tenant por
-- trigger (reutiliza core.verificar_mismo_tenant). Estado del negocio derivado del tipo de la etapa.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "comercial";

-- CreateTable
CREATE TABLE "comercial"."embudos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "por_defecto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "embudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."etapas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "embudo_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "tipo" TEXT NOT NULL DEFAULT 'abierta',
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "tono" TEXT NOT NULL DEFAULT 'neutral',
    "exige" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."negocios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "embudo_id" UUID NOT NULL,
    "etapa_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "titulo" TEXT NOT NULL,
    "tipo_id" UUID,
    "origen_id" UUID,
    "responsable_id" UUID,
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "monto_estimado_mensual" INTEGER,
    "valor_mensual" INTEGER,
    "cotizacion_enviada_en" TIMESTAMPTZ(6),
    "cierre_estimado" DATE,
    "inicio_servicio_estimado" DATE,
    "motivo_perdida_id" UUID,
    "motivo_perdida_detalle" TEXT,
    "competidor" TEXT,
    "ganado_en" TIMESTAMPTZ(6),
    "perdido_en" TIMESTAMPTZ(6),
    "reabierto_en" TIMESTAMPTZ(6),
    "archivado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "negocios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."negocio_instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'nueva',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "negocio_instalaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."negocio_contactos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "contacto_id" UUID NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'decisor',
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "negocio_contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."negocio_etapas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "de_etapa_id" UUID,
    "a_etapa_id" UUID NOT NULL,
    "actor_tipo" TEXT NOT NULL DEFAULT 'user',
    "actor_id" UUID,
    "motivo" TEXT,
    "segundos_en_anterior" INTEGER,
    "cuando" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negocio_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."tipos_negocio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tipos_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."origenes_negocio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "origenes_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercial"."motivos_perdida" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "exige_detalle" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "motivos_perdida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "embudos_tenant_id_idx" ON "comercial"."embudos"("tenant_id");
CREATE UNIQUE INDEX "embudos_tenant_id_por_defecto_key" ON "comercial"."embudos"("tenant_id") WHERE "por_defecto";

-- CreateIndex
CREATE INDEX "etapas_tenant_id_embudo_id_idx" ON "comercial"."etapas"("tenant_id", "embudo_id");
CREATE UNIQUE INDEX "etapas_tenant_id_embudo_id_orden_key" ON "comercial"."etapas"("tenant_id", "embudo_id", "orden");
-- A lo más una etapa ganada y a lo más una perdida por embudo (la regla "exactamente una" la asegura la siembra y la capacidad).
CREATE UNIQUE INDEX "etapas_embudo_id_tipo_cerrada_key" ON "comercial"."etapas"("embudo_id", "tipo") WHERE "tipo" IN ('ganada', 'perdida');

-- CreateIndex
CREATE INDEX "negocios_tenant_id_estado_idx" ON "comercial"."negocios"("tenant_id", "estado");
CREATE INDEX "negocios_tenant_id_etapa_id_idx" ON "comercial"."negocios"("tenant_id", "etapa_id");
CREATE INDEX "negocios_tenant_id_cuenta_id_idx" ON "comercial"."negocios"("tenant_id", "cuenta_id");
CREATE INDEX "negocios_tenant_id_responsable_id_idx" ON "comercial"."negocios"("tenant_id", "responsable_id");

-- CreateIndex
CREATE INDEX "negocio_instalaciones_tenant_id_instalacion_id_idx" ON "comercial"."negocio_instalaciones"("tenant_id", "instalacion_id");
CREATE UNIQUE INDEX "negocio_instalaciones_tenant_id_negocio_id_instalacion_id_key" ON "comercial"."negocio_instalaciones"("tenant_id", "negocio_id", "instalacion_id");

-- CreateIndex
CREATE INDEX "negocio_contactos_tenant_id_contacto_id_idx" ON "comercial"."negocio_contactos"("tenant_id", "contacto_id");
CREATE UNIQUE INDEX "negocio_contactos_tenant_id_negocio_id_contacto_id_key" ON "comercial"."negocio_contactos"("tenant_id", "negocio_id", "contacto_id");
-- Un solo contacto principal por negocio.
CREATE UNIQUE INDEX "negocio_contactos_tenant_id_negocio_id_principal_key" ON "comercial"."negocio_contactos"("tenant_id", "negocio_id") WHERE "es_principal";

-- CreateIndex
CREATE INDEX "negocio_etapas_tenant_id_negocio_id_cuando_idx" ON "comercial"."negocio_etapas"("tenant_id", "negocio_id", "cuando");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_negocio_tenant_id_nombre_key" ON "comercial"."tipos_negocio"("tenant_id", "nombre");
CREATE UNIQUE INDEX "origenes_negocio_tenant_id_nombre_key" ON "comercial"."origenes_negocio"("tenant_id", "nombre");
CREATE UNIQUE INDEX "motivos_perdida_tenant_id_codigo_key" ON "comercial"."motivos_perdida"("tenant_id", "codigo");

-- AddForeignKey (tenant_id -> core.tenants; la relación a Tenant no está en el schema Prisma, ADR-040)
ALTER TABLE "comercial"."embudos" ADD CONSTRAINT "embudos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."etapas" ADD CONSTRAINT "etapas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."etapas" ADD CONSTRAINT "etapas_embudo_id_fkey" FOREIGN KEY ("embudo_id") REFERENCES "comercial"."embudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_embudo_id_fkey" FOREIGN KEY ("embudo_id") REFERENCES "comercial"."embudos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "comercial"."etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "comercial"."tipos_negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "comercial"."origenes_negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_motivo_perdida_id_fkey" FOREIGN KEY ("motivo_perdida_id") REFERENCES "comercial"."motivos_perdida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocios" ADD CONSTRAINT "negocios_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_instalaciones" ADD CONSTRAINT "negocio_instalaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_instalaciones" ADD CONSTRAINT "negocio_instalaciones_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_instalaciones" ADD CONSTRAINT "negocio_instalaciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_contactos" ADD CONSTRAINT "negocio_contactos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_contactos" ADD CONSTRAINT "negocio_contactos_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_contactos" ADD CONSTRAINT "negocio_contactos_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_etapas" ADD CONSTRAINT "negocio_etapas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_etapas" ADD CONSTRAINT "negocio_etapas_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_etapas" ADD CONSTRAINT "negocio_etapas_de_etapa_id_fkey" FOREIGN KEY ("de_etapa_id") REFERENCES "comercial"."etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_etapas" ADD CONSTRAINT "negocio_etapas_a_etapa_id_fkey" FOREIGN KEY ("a_etapa_id") REFERENCES "comercial"."etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."tipos_negocio" ADD CONSTRAINT "tipos_negocio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."origenes_negocio" ADD CONSTRAINT "origenes_negocio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."motivos_perdida" ADD CONSTRAINT "motivos_perdida_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md).
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA "comercial" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "comercial" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "comercial" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "comercial" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "comercial" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- ---------------------------------------------------------------------------
-- Row-Level Security: una sola política tenant_isolation por tabla, TO opai_app.
-- ---------------------------------------------------------------------------
ALTER TABLE "comercial"."embudos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."embudos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."etapas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."etapas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."negocios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."negocios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."negocio_instalaciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."negocio_instalaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."negocio_contactos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."negocio_contactos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."negocio_etapas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."negocio_etapas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."tipos_negocio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."tipos_negocio" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."origenes_negocio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."origenes_negocio" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."motivos_perdida" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."motivos_perdida" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS). Reutiliza la función
-- del núcleo (core.verificar_mismo_tenant, SECURITY DEFINER): pares (columna, tabla referida).
-- ---------------------------------------------------------------------------
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."etapas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('embudo_id', 'comercial.embudos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."negocios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'cuenta_id', 'core.cuentas', 'embudo_id', 'comercial.embudos', 'etapa_id', 'comercial.etapas',
    'tipo_id', 'comercial.tipos_negocio', 'origen_id', 'comercial.origenes_negocio',
    'motivo_perdida_id', 'comercial.motivos_perdida');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."negocio_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'negocio_id', 'comercial.negocios', 'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."negocio_contactos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'negocio_id', 'comercial.negocios', 'contacto_id', 'core.contactos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."negocio_etapas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'negocio_id', 'comercial.negocios', 'de_etapa_id', 'comercial.etapas', 'a_etapa_id', 'comercial.etapas');

-- La instalación y el contacto de un negocio son de la cuenta del negocio (R16, caso borde §12).
CREATE OR REPLACE FUNCTION "comercial"."verificar_misma_cuenta"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  cuenta_negocio uuid;
  cuenta_ref uuid;
BEGIN
  SELECT cuenta_id INTO cuenta_negocio FROM "comercial"."negocios" WHERE id = NEW.negocio_id;
  EXECUTE format('SELECT cuenta_id FROM %s WHERE id = $1', TG_ARGV[0])
    INTO cuenta_ref USING (to_jsonb(NEW) ->> TG_ARGV[1])::uuid;
  IF cuenta_ref IS DISTINCT FROM cuenta_negocio THEN
    RAISE EXCEPTION '%.% no pertenece a la cuenta del negocio', TG_TABLE_NAME, TG_ARGV[1]
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "comercial"."verificar_misma_cuenta"() FROM PUBLIC;
CREATE TRIGGER misma_cuenta BEFORE INSERT OR UPDATE ON "comercial"."negocio_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "comercial"."verificar_misma_cuenta"('core.instalaciones', 'instalacion_id');
CREATE TRIGGER misma_cuenta BEFORE INSERT OR UPDATE ON "comercial"."negocio_contactos"
  FOR EACH ROW EXECUTE FUNCTION "comercial"."verificar_misma_cuenta"('core.contactos', 'contacto_id');

-- El estado del negocio se deriva del tipo de su etapa (R8): abierta->abierto, ganada->ganado, perdida->perdido.
CREATE OR REPLACE FUNCTION "comercial"."derivar_estado_negocio"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  t text;
BEGIN
  SELECT tipo INTO t FROM "comercial"."etapas" WHERE id = NEW.etapa_id;
  NEW.estado := CASE t WHEN 'ganada' THEN 'ganado' WHEN 'perdida' THEN 'perdido' ELSE 'abierto' END;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "comercial"."derivar_estado_negocio"() FROM PUBLIC;
CREATE TRIGGER derivar_estado BEFORE INSERT OR UPDATE ON "comercial"."negocios"
  FOR EACH ROW EXECUTE FUNCTION "comercial"."derivar_estado_negocio"();

-- El historial de etapas es append-only (R11): las correcciones son filas nuevas.
CREATE OR REPLACE FUNCTION "comercial"."historial_inmutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'comercial.negocio_etapas es append-only: % no permitido', TG_OP;
END
$$;
CREATE TRIGGER inmutable BEFORE UPDATE OR DELETE ON "comercial"."negocio_etapas"
  FOR EACH ROW EXECUTE FUNCTION "comercial"."historial_inmutable"();
CREATE TRIGGER inmutable_statement BEFORE TRUNCATE ON "comercial"."negocio_etapas"
  FOR EACH STATEMENT EXECUTE FUNCTION "comercial"."historial_inmutable"();
