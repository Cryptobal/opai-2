-- Seguimiento comercial (CAR-67). Migración ADITIVA e IDEMPOTENTE: crea las tablas nuevas de planes
-- versionados, seguimientos, pasos agendados y correos entrantes, con RLS (ENABLE + FORCE) y política
-- tenant_isolation, más la función SECURITY DEFINER que resuelve el tenant de un token de respuesta.
-- No toca tablas ni datos existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "comercial"."seguimiento_planes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "disparador" TEXT NOT NULL,
    "por_defecto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version_actual" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "seguimiento_planes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seguimiento_planes_disparador_check"
      CHECK ("disparador" IN ('cotizacion_enviada', 'entra_a_etapa', 'manual')),
    CONSTRAINT "seguimiento_planes_nombre_check" CHECK (length(btrim("nombre")) BETWEEN 3 AND 60)
);
CREATE INDEX IF NOT EXISTS "seguimiento_planes_tenant_id_idx" ON "comercial"."seguimiento_planes"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "seguimiento_planes_nombre_key"
    ON "comercial"."seguimiento_planes"("tenant_id", lower("nombre"));

CREATE TABLE IF NOT EXISTS "comercial"."seguimiento_plan_versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "creada_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seguimiento_plan_versiones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "seguimiento_plan_versiones_plan_id_version_key"
    ON "comercial"."seguimiento_plan_versiones"("plan_id", "version");
CREATE INDEX IF NOT EXISTS "seguimiento_plan_versiones_tenant_id_idx"
    ON "comercial"."seguimiento_plan_versiones"("tenant_id");

CREATE TABLE IF NOT EXISTS "comercial"."seguimientos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "plan_version" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "motivo" TEXT,
    "motivo_detalle" TEXT,
    "ancla" TIMESTAMPTZ(6) NOT NULL,
    "cotizacion_id" UUID,
    "cotizacion_codigo" TEXT,
    "contacto_id" UUID,
    "token" TEXT NOT NULL,
    "creado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "seguimientos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seguimientos_estado_check"
      CHECK ("estado" IN ('activo', 'pausado', 'terminado', 'cancelado'))
);
CREATE INDEX IF NOT EXISTS "seguimientos_tenant_id_negocio_id_idx" ON "comercial"."seguimientos"("tenant_id", "negocio_id");
CREATE INDEX IF NOT EXISTS "seguimientos_tenant_id_estado_idx" ON "comercial"."seguimientos"("tenant_id", "estado");
-- A lo más un seguimiento vivo (activo o pausado) por negocio (R6).
CREATE UNIQUE INDEX IF NOT EXISTS "seguimientos_negocio_vivo_key"
    ON "comercial"."seguimientos"("negocio_id") WHERE "estado" IN ('activo', 'pausado');
CREATE UNIQUE INDEX IF NOT EXISTS "seguimientos_token_key" ON "comercial"."seguimientos"("token");

CREATE TABLE IF NOT EXISTS "comercial"."seguimiento_pasos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seguimiento_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "canal" TEXT NOT NULL,
    "ejecutor" TEXT NOT NULL,
    "programado_en" TIMESTAMPTZ(6) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'programado',
    "asignado_id" UUID,
    "asunto" TEXT,
    "cuerpo" TEXT,
    "resultado" TEXT,
    "error" TEXT,
    "actividad_id" UUID,
    "hecho_en" TIMESTAMPTZ(6),
    "hecho_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "seguimiento_pasos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seguimiento_pasos_canal_check"
      CHECK ("canal" IN ('correo', 'whatsapp', 'llamada', 'interno')),
    CONSTRAINT "seguimiento_pasos_ejecutor_check"
      CHECK ("ejecutor" IN ('persona', 'opai_automatico', 'agente')),
    CONSTRAINT "seguimiento_pasos_estado_check"
      CHECK ("estado" IN ('programado', 'por_hacer', 'por_preparar', 'hecho', 'omitido', 'fallido', 'cancelado'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "seguimiento_pasos_seguimiento_id_orden_key"
    ON "comercial"."seguimiento_pasos"("seguimiento_id", "orden");
CREATE INDEX IF NOT EXISTS "seguimiento_pasos_tenant_id_estado_programado_en_idx"
    ON "comercial"."seguimiento_pasos"("tenant_id", "estado", "programado_en");
CREATE INDEX IF NOT EXISTS "seguimiento_pasos_tenant_id_asignado_id_idx"
    ON "comercial"."seguimiento_pasos"("tenant_id", "asignado_id");

CREATE TABLE IF NOT EXISTS "comercial"."seguimiento_entrantes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seguimiento_id" UUID NOT NULL,
    "mensaje_id" TEXT NOT NULL,
    "remitente" TEXT NOT NULL,
    "asunto" TEXT,
    "texto" TEXT NOT NULL,
    "actividad_id" UUID,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seguimiento_entrantes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "seguimiento_entrantes_tenant_id_mensaje_id_key"
    ON "comercial"."seguimiento_entrantes"("tenant_id", "mensaje_id");
CREATE INDEX IF NOT EXISTS "seguimiento_entrantes_tenant_id_seguimiento_id_idx"
    ON "comercial"."seguimiento_entrantes"("tenant_id", "seguimiento_id");

-- Llaves foráneas (idempotentes: solo si faltan).
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_planes" ADD CONSTRAINT "seguimiento_planes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_plan_versiones" ADD CONSTRAINT "seguimiento_plan_versiones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_plan_versiones" ADD CONSTRAINT "seguimiento_plan_versiones_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "comercial"."seguimiento_planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimientos" ADD CONSTRAINT "seguimientos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimientos" ADD CONSTRAINT "seguimientos_negocio_id_fkey"
    FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimientos" ADD CONSTRAINT "seguimientos_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "comercial"."seguimiento_planes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_pasos" ADD CONSTRAINT "seguimiento_pasos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_pasos" ADD CONSTRAINT "seguimiento_pasos_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "comercial"."seguimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_entrantes" ADD CONSTRAINT "seguimiento_entrantes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."seguimiento_entrantes" ADD CONSTRAINT "seguimiento_entrantes_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "comercial"."seguimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."seguimiento_planes" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."seguimiento_plan_versiones" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."seguimientos" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."seguimiento_pasos" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."seguimiento_entrantes" TO opai_app;

-- Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS), con FORCE.
ALTER TABLE "comercial"."seguimiento_planes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."seguimiento_planes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."seguimiento_planes";
CREATE POLICY tenant_isolation ON "comercial"."seguimiento_planes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."seguimiento_plan_versiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."seguimiento_plan_versiones" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."seguimiento_plan_versiones";
CREATE POLICY tenant_isolation ON "comercial"."seguimiento_plan_versiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."seguimientos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."seguimientos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."seguimientos";
CREATE POLICY tenant_isolation ON "comercial"."seguimientos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."seguimiento_pasos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."seguimiento_pasos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."seguimiento_pasos";
CREATE POLICY tenant_isolation ON "comercial"."seguimiento_pasos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."seguimiento_entrantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."seguimiento_entrantes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."seguimiento_entrantes";
CREATE POLICY tenant_isolation ON "comercial"."seguimiento_entrantes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
DROP TRIGGER IF EXISTS mismo_tenant ON "comercial"."seguimientos";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."seguimientos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'negocio_id', 'comercial.negocios', 'plan_id', 'comercial.seguimiento_planes',
    'contacto_id', 'core.contactos');
DROP TRIGGER IF EXISTS mismo_tenant ON "comercial"."seguimiento_pasos";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."seguimiento_pasos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'seguimiento_id', 'comercial.seguimientos', 'actividad_id', 'core.actividades');
DROP TRIGGER IF EXISTS mismo_tenant ON "comercial"."seguimiento_entrantes";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."seguimiento_entrantes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'seguimiento_id', 'comercial.seguimientos', 'actividad_id', 'core.actividades');
DROP TRIGGER IF EXISTS mismo_tenant ON "comercial"."seguimiento_plan_versiones";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."seguimiento_plan_versiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'plan_id', 'comercial.seguimiento_planes');

-- Resuelve el tenant y el seguimiento de un token de respuesta (receptor del correo entrante). Corre
-- sin tenant fijado, así que es SECURITY DEFINER: devuelve solo (tenant_id, seguimiento_id) de un token
-- exacto («s» + 32 hex, aleatorio de 128 bits); opai_app no puede listar tokens ni leer otra columna.
CREATE OR REPLACE FUNCTION "comercial"."seguimiento_resolver_token"(p_token text)
RETURNS TABLE(tenant_id uuid, seguimiento_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT s.tenant_id, s.id FROM "comercial"."seguimientos" s
  WHERE p_token ~ '^s[0-9a-f]{32}$' AND s.token = p_token LIMIT 1
$$;
REVOKE ALL ON FUNCTION "comercial"."seguimiento_resolver_token"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "comercial"."seguimiento_resolver_token"(text) TO opai_app;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP FUNCTION IF EXISTS "comercial"."seguimiento_resolver_token"(text);
--   DROP TABLE IF EXISTS "comercial"."seguimiento_entrantes", "comercial"."seguimiento_pasos",
--     "comercial"."seguimientos", "comercial"."seguimiento_plan_versiones",
--     "comercial"."seguimiento_planes" CASCADE;
-- Solo elimina objetos nuevos de esta migración; si ya hay datos, restaura desde el snapshot de Neon.
