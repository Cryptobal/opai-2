-- CRM PR 2a (CAR-26): contacto en varias cuentas (N–N), actividad unificada y etiquetas del tenant.
-- Migración ADITIVA e IDEMPOTENTE: crea tablas nuevas en `core` (contacto_cuentas, actividades,
-- actividad_vinculos, actividad_responsables, etiquetas, etiqueta_asignaciones), sus índices, FK,
-- checks, RLS (ENABLE + FORCE), triggers de mismo tenant y de usuario miembro. NO borra ni cambia
-- columnas ni datos: `core.contactos.cuenta_id` (y cargo, roles, es_principal) se conserva como
-- vínculo inicial. Los vínculos iniciales se rellenan por tenant, con `app.tenant_id` fijado para
-- que FORCE RLS no filtre en silencio, y se verifica que cada contacto quedó con su vínculo.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "core"."contacto_cuentas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contacto_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "cargo" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contacto_cuentas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "contacto_cuentas_tenant_id_contacto_id_cuenta_id_key"
    ON "core"."contacto_cuentas"("tenant_id", "contacto_id", "cuenta_id");
CREATE INDEX IF NOT EXISTS "contacto_cuentas_tenant_id_cuenta_id_idx"
    ON "core"."contacto_cuentas"("tenant_id", "cuenta_id");
-- R15: un solo principal por cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS "contacto_cuentas_principal_unico"
    ON "core"."contacto_cuentas"("cuenta_id") WHERE "es_principal";

CREATE TABLE IF NOT EXISTS "core"."actividades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "ocurrio_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vencimiento" TIMESTAMPTZ(6),
    "todo_el_dia" BOOLEAN NOT NULL DEFAULT false,
    "prioridad" TEXT,
    "estado" TEXT,
    "asistentes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acuerdos" TEXT,
    "proximo_paso" TEXT,
    "completada_en" TIMESTAMPTZ(6),
    "completada_por_id" UUID,
    "creada_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "actividades_tipo_check"
      CHECK ("tipo" IN ('nota', 'llamada', 'correo', 'whatsapp', 'reunion', 'visita', 'tarea')),
    CONSTRAINT "actividades_prioridad_check"
      CHECK ("prioridad" IS NULL OR "prioridad" IN ('alta', 'media', 'baja')),
    CONSTRAINT "actividades_estado_check"
      CHECK ("estado" IS NULL OR "estado" IN ('pendiente', 'hecha', 'cancelada')),
    -- Solo las tareas llevan estado, prioridad y vencimiento.
    CONSTRAINT "actividades_tarea_check" CHECK (
      ("tipo" = 'tarea' AND "estado" IS NOT NULL AND "prioridad" IS NOT NULL)
      OR ("tipo" <> 'tarea' AND "estado" IS NULL AND "prioridad" IS NULL AND "vencimiento" IS NULL)),
    CONSTRAINT "actividades_titulo_check" CHECK (length(btrim("titulo")) > 0)
);
CREATE INDEX IF NOT EXISTS "actividades_tenant_id_tipo_estado_vencimiento_idx"
    ON "core"."actividades"("tenant_id", "tipo", "estado", "vencimiento");
CREATE INDEX IF NOT EXISTS "actividades_tenant_id_ocurrio_en_idx"
    ON "core"."actividades"("tenant_id", "ocurrio_en");

CREATE TABLE IF NOT EXISTS "core"."actividad_vinculos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actividad_id" UUID NOT NULL,
    "negocio_id" UUID,
    "cuenta_id" UUID,
    "contacto_id" UUID,
    "instalacion_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "actividad_vinculos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "actividad_vinculos_una_entidad_check"
      CHECK (num_nonnulls("negocio_id", "cuenta_id", "contacto_id", "instalacion_id") = 1)
);
CREATE INDEX IF NOT EXISTS "actividad_vinculos_tenant_id_actividad_id_idx"
    ON "core"."actividad_vinculos"("tenant_id", "actividad_id");
CREATE INDEX IF NOT EXISTS "actividad_vinculos_tenant_id_negocio_id_idx"
    ON "core"."actividad_vinculos"("tenant_id", "negocio_id");
CREATE INDEX IF NOT EXISTS "actividad_vinculos_tenant_id_cuenta_id_idx"
    ON "core"."actividad_vinculos"("tenant_id", "cuenta_id");
CREATE INDEX IF NOT EXISTS "actividad_vinculos_tenant_id_contacto_id_idx"
    ON "core"."actividad_vinculos"("tenant_id", "contacto_id");
CREATE INDEX IF NOT EXISTS "actividad_vinculos_tenant_id_instalacion_id_idx"
    ON "core"."actividad_vinculos"("tenant_id", "instalacion_id");
-- Una actividad se liga una sola vez a cada entidad.
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_vinculos_negocio_unico"
    ON "core"."actividad_vinculos"("actividad_id", "negocio_id") WHERE "negocio_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_vinculos_cuenta_unico"
    ON "core"."actividad_vinculos"("actividad_id", "cuenta_id") WHERE "cuenta_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_vinculos_contacto_unico"
    ON "core"."actividad_vinculos"("actividad_id", "contacto_id") WHERE "contacto_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_vinculos_instalacion_unico"
    ON "core"."actividad_vinculos"("actividad_id", "instalacion_id") WHERE "instalacion_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "core"."actividad_responsables" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actividad_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "actividad_responsables_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_responsables_tenant_id_actividad_id_usuario_id_key"
    ON "core"."actividad_responsables"("tenant_id", "actividad_id", "usuario_id");
CREATE INDEX IF NOT EXISTS "actividad_responsables_tenant_id_usuario_id_idx"
    ON "core"."actividad_responsables"("tenant_id", "usuario_id");

CREATE TABLE IF NOT EXISTS "core"."etiquetas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tono" TEXT NOT NULL DEFAULT 'neutral',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "etiquetas_tono_check"
      CHECK ("tono" IN ('neutral', 'info', 'success', 'warning', 'danger')),
    CONSTRAINT "etiquetas_nombre_check" CHECK (length(btrim("nombre")) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "etiquetas_tenant_id_nombre_key"
    ON "core"."etiquetas"("tenant_id", "nombre");

CREATE TABLE IF NOT EXISTS "core"."etiqueta_asignaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "etiqueta_id" UUID NOT NULL,
    "negocio_id" UUID,
    "cuenta_id" UUID,
    "contacto_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "etiqueta_asignaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "etiqueta_asignaciones_una_entidad_check"
      CHECK (num_nonnulls("negocio_id", "cuenta_id", "contacto_id") = 1)
);
CREATE INDEX IF NOT EXISTS "etiqueta_asignaciones_tenant_id_etiqueta_id_idx"
    ON "core"."etiqueta_asignaciones"("tenant_id", "etiqueta_id");
CREATE INDEX IF NOT EXISTS "etiqueta_asignaciones_tenant_id_negocio_id_idx"
    ON "core"."etiqueta_asignaciones"("tenant_id", "negocio_id");
CREATE INDEX IF NOT EXISTS "etiqueta_asignaciones_tenant_id_cuenta_id_idx"
    ON "core"."etiqueta_asignaciones"("tenant_id", "cuenta_id");
CREATE INDEX IF NOT EXISTS "etiqueta_asignaciones_tenant_id_contacto_id_idx"
    ON "core"."etiqueta_asignaciones"("tenant_id", "contacto_id");
CREATE UNIQUE INDEX IF NOT EXISTS "etiqueta_asignaciones_negocio_unico"
    ON "core"."etiqueta_asignaciones"("etiqueta_id", "negocio_id") WHERE "negocio_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "etiqueta_asignaciones_cuenta_unico"
    ON "core"."etiqueta_asignaciones"("etiqueta_id", "cuenta_id") WHERE "cuenta_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "etiqueta_asignaciones_contacto_unico"
    ON "core"."etiqueta_asignaciones"("etiqueta_id", "contacto_id") WHERE "contacto_id" IS NOT NULL;

-- Llaves foráneas (idempotentes: solo si faltan).
DO $$ BEGIN
  ALTER TABLE "core"."contacto_cuentas" ADD CONSTRAINT "contacto_cuentas_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."contacto_cuentas" ADD CONSTRAINT "contacto_cuentas_contacto_id_fkey"
    FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."contacto_cuentas" ADD CONSTRAINT "contacto_cuentas_cuenta_id_fkey"
    FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividades" ADD CONSTRAINT "actividades_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_vinculos" ADD CONSTRAINT "actividad_vinculos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_vinculos" ADD CONSTRAINT "actividad_vinculos_actividad_id_fkey"
    FOREIGN KEY ("actividad_id") REFERENCES "core"."actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_vinculos" ADD CONSTRAINT "actividad_vinculos_negocio_id_fkey"
    FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_vinculos" ADD CONSTRAINT "actividad_vinculos_cuenta_id_fkey"
    FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_vinculos" ADD CONSTRAINT "actividad_vinculos_contacto_id_fkey"
    FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_vinculos" ADD CONSTRAINT "actividad_vinculos_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_responsables" ADD CONSTRAINT "actividad_responsables_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."actividad_responsables" ADD CONSTRAINT "actividad_responsables_actividad_id_fkey"
    FOREIGN KEY ("actividad_id") REFERENCES "core"."actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."etiquetas" ADD CONSTRAINT "etiquetas_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."etiqueta_asignaciones" ADD CONSTRAINT "etiqueta_asignaciones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."etiqueta_asignaciones" ADD CONSTRAINT "etiqueta_asignaciones_etiqueta_id_fkey"
    FOREIGN KEY ("etiqueta_id") REFERENCES "core"."etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."etiqueta_asignaciones" ADD CONSTRAINT "etiqueta_asignaciones_negocio_id_fkey"
    FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."etiqueta_asignaciones" ADD CONSTRAINT "etiqueta_asignaciones_cuenta_id_fkey"
    FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."etiqueta_asignaciones" ADD CONSTRAINT "etiqueta_asignaciones_contacto_id_fkey"
    FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permisos y Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS), con FORCE.
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."contacto_cuentas" TO opai_app;
ALTER TABLE "core"."contacto_cuentas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."contacto_cuentas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."contacto_cuentas";
CREATE POLICY tenant_isolation ON "core"."contacto_cuentas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."actividades" TO opai_app;
ALTER TABLE "core"."actividades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."actividades" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."actividades";
CREATE POLICY tenant_isolation ON "core"."actividades" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."actividad_vinculos" TO opai_app;
ALTER TABLE "core"."actividad_vinculos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."actividad_vinculos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."actividad_vinculos";
CREATE POLICY tenant_isolation ON "core"."actividad_vinculos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."actividad_responsables" TO opai_app;
ALTER TABLE "core"."actividad_responsables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."actividad_responsables" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."actividad_responsables";
CREATE POLICY tenant_isolation ON "core"."actividad_responsables" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."etiquetas" TO opai_app;
ALTER TABLE "core"."etiquetas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."etiquetas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."etiquetas";
CREATE POLICY tenant_isolation ON "core"."etiquetas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."etiqueta_asignaciones" TO opai_app;
ALTER TABLE "core"."etiqueta_asignaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."etiqueta_asignaciones" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."etiqueta_asignaciones";
CREATE POLICY tenant_isolation ON "core"."etiqueta_asignaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."contacto_cuentas";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."contacto_cuentas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'contacto_id', 'core.contactos', 'cuenta_id', 'core.cuentas');
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."actividad_vinculos";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."actividad_vinculos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'actividad_id', 'core.actividades', 'negocio_id', 'comercial.negocios',
    'cuenta_id', 'core.cuentas', 'contacto_id', 'core.contactos',
    'instalacion_id', 'core.instalaciones');
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."actividad_responsables";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."actividad_responsables"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('actividad_id', 'core.actividades');
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."etiqueta_asignaciones";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."etiqueta_asignaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'etiqueta_id', 'core.etiquetas', 'negocio_id', 'comercial.negocios',
    'cuenta_id', 'core.cuentas', 'contacto_id', 'core.contactos');

-- Los usuarios (responsables, quien creó o completó) deben ser miembros de la empresa.
DROP TRIGGER IF EXISTS usuario_miembro ON "core"."actividades";
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "creada_por_id", "completada_por_id", "tenant_id" ON "core"."actividades"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('creada_por_id', 'completada_por_id');
DROP TRIGGER IF EXISTS usuario_miembro ON "core"."actividad_responsables";
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "usuario_id", "tenant_id" ON "core"."actividad_responsables"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('usuario_id');

-- Vínculo inicial: todo contacto nuevo nace con su vínculo a `cuenta_id`, y editar cargo, roles o
-- principal en `core.contactos` (capacidades existentes) se refleja en ese vínculo. Un solo sentido:
-- las capacidades nuevas escriben el vínculo y, si es el inicial, también la fila del contacto.
CREATE OR REPLACE FUNCTION "core"."contacto_sincronizar_vinculo"() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.es_principal THEN
    UPDATE core.contacto_cuentas SET es_principal = false, updated_at = now()
     WHERE cuenta_id = NEW.cuenta_id AND es_principal AND contacto_id <> NEW.id;
  END IF;
  INSERT INTO core.contacto_cuentas
    (id, tenant_id, contacto_id, cuenta_id, cargo, roles, es_principal, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.tenant_id, NEW.id, NEW.cuenta_id, NEW.cargo, NEW.roles,
          NEW.es_principal, now(), now())
  ON CONFLICT (tenant_id, contacto_id, cuenta_id) DO UPDATE
    SET cargo = EXCLUDED.cargo, roles = EXCLUDED.roles, es_principal = EXCLUDED.es_principal,
        updated_at = now();
  RETURN NULL;
END
$$;
REVOKE ALL ON FUNCTION "core"."contacto_sincronizar_vinculo"() FROM PUBLIC;
DROP TRIGGER IF EXISTS sincronizar_vinculo_alta ON "core"."contactos";
CREATE TRIGGER sincronizar_vinculo_alta AFTER INSERT ON "core"."contactos"
  FOR EACH ROW EXECUTE FUNCTION "core"."contacto_sincronizar_vinculo"();
DROP TRIGGER IF EXISTS sincronizar_vinculo_cambio ON "core"."contactos";
CREATE TRIGGER sincronizar_vinculo_cambio AFTER UPDATE OF "cargo", "roles", "es_principal" ON "core"."contactos"
  FOR EACH ROW WHEN (NEW."cuenta_id" = OLD."cuenta_id" AND (
    NEW."cargo" IS DISTINCT FROM OLD."cargo" OR NEW."roles" IS DISTINCT FROM OLD."roles"
    OR NEW."es_principal" IS DISTINCT FROM OLD."es_principal"))
  EXECUTE FUNCTION "core"."contacto_sincronizar_vinculo"();

-- Relleno: un vínculo por contacto existente, por tenant. Con FORCE RLS, un INSERT o SELECT sin
-- `app.tenant_id` no ve ni escribe filas, así que se fija por tenant y se verifica el resultado.
DO $$
DECLARE
  t uuid;
  faltan int;
BEGIN
  FOR t IN SELECT id FROM core.tenants LOOP
    PERFORM set_config('app.tenant_id', t::text, true);
    INSERT INTO core.contacto_cuentas
      (id, tenant_id, contacto_id, cuenta_id, cargo, roles, es_principal, created_at, updated_at)
    SELECT gen_random_uuid(), c.tenant_id, c.id, c.cuenta_id, c.cargo, c.roles,
           (c.es_principal AND c.rn = 1), now(), now()
    FROM (SELECT x.*, row_number() OVER (
            PARTITION BY x.cuenta_id ORDER BY (NOT x.es_principal), x.created_at, x.id) AS rn
          FROM core.contactos x WHERE x.tenant_id = t) c
    ON CONFLICT (tenant_id, contacto_id, cuenta_id) DO NOTHING;
    SELECT count(*) INTO faltan FROM core.contactos c
     WHERE c.tenant_id = t AND NOT EXISTS (
       SELECT 1 FROM core.contacto_cuentas v
        WHERE v.contacto_id = c.id AND v.cuenta_id = c.cuenta_id);
    IF faltan > 0 THEN
      RAISE EXCEPTION 'Relleno de contacto_cuentas incompleto: % contactos sin vínculo', faltan;
    END IF;
  END LOOP;
  PERFORM set_config('app.tenant_id', '', true);
END $$;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TRIGGER IF EXISTS sincronizar_vinculo_cambio ON "core"."contactos";
--   DROP TRIGGER IF EXISTS sincronizar_vinculo_alta ON "core"."contactos";
--   DROP FUNCTION IF EXISTS "core"."contacto_sincronizar_vinculo"();
--   DROP TABLE "core"."etiqueta_asignaciones", "core"."etiquetas", "core"."actividad_responsables",
--     "core"."actividad_vinculos", "core"."actividades", "core"."contacto_cuentas" CASCADE;
-- Las columnas de core.contactos no se tocaron: no hay datos que restaurar.
