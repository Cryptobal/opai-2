-- CAR-79 · Calendario hábil y feriados del Núcleo. Tabla core.dias_calendario con RLS tenant_isolation
-- más una política de lectura de las filas de plataforma (tenant_id nulo). Las filas de plataforma se
-- cargan por migración o seed con un rol BYPASSRLS; opai_app no puede escribirlas (WITH CHECK exige
-- tenant_id = app.tenant_id, nunca nulo). Posterior a 20261029010000 y a force_rls: la tabla nace con
-- ENABLE + FORCE ROW LEVEL SECURITY. Idempotente (IF NOT EXISTS / DROP ... IF EXISTS).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateTable
CREATE TABLE IF NOT EXISTS "core"."dias_calendario" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "fecha" DATE NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'feriado',
    "nombre" TEXT NOT NULL,
    "irrenunciable" BOOLEAN NOT NULL DEFAULT false,
    "region" TEXT,
    "instalacion_id" UUID,
    "fuente" TEXT NOT NULL DEFAULT 'nacional',
    "archivada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_calendario_pkey" PRIMARY KEY ("id"),
    -- En la v1 solo se modela "feriado"; H (hábil forzado) e I (inhábil) son propuesta (ADR).
    CONSTRAINT "dias_calendario_tipo_check" CHECK ("tipo" = 'feriado'),
    -- Coherencia fuente/tenant/región/instalación: plataforma nacional (sin región ni instalación),
    -- plataforma regional (con región) o del tenant (sin región; puede acotar una instalación).
    CONSTRAINT "dias_calendario_coherencia_check" CHECK (
      ("tenant_id" IS NULL AND "fuente" = 'nacional' AND "region" IS NULL AND "instalacion_id" IS NULL)
      OR ("tenant_id" IS NULL AND "fuente" = 'regional' AND "region" IS NOT NULL AND "instalacion_id" IS NULL)
      OR ("tenant_id" IS NOT NULL AND "fuente" = 'tenant' AND "region" IS NULL)
    )
);

-- CreateIndex: lectura del calendario del tenant y de las filas de plataforma por fecha/región.
CREATE INDEX IF NOT EXISTS "dias_calendario_tenant_id_fecha_idx" ON "core"."dias_calendario"("tenant_id", "fecha");
CREATE INDEX IF NOT EXISTS "dias_calendario_region_fecha_idx" ON "core"."dias_calendario"("region", "fecha");
-- Un día del tenant por fecha e instalación (o global) mientras no esté archivado: un duplicado da CONFLICT.
CREATE UNIQUE INDEX IF NOT EXISTS "dias_calendario_tenant_fecha_instalacion_key"
  ON "core"."dias_calendario"("tenant_id", "fecha", COALESCE("instalacion_id", '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE "tenant_id" IS NOT NULL AND "archivada_en" IS NULL;
-- Un feriado de plataforma por fecha y región (región nula = nacional) mientras no esté archivado.
CREATE UNIQUE INDEX IF NOT EXISTS "dias_calendario_plataforma_fecha_region_key"
  ON "core"."dias_calendario"("fecha", COALESCE("region", ''))
  WHERE "tenant_id" IS NULL AND "archivada_en" IS NULL;

-- AddForeignKey (la relación a Tenant no está en el schema Prisma; la FK vive aquí). Nulo = plataforma.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dias_calendario_tenant_id_fkey'
    AND conrelid = 'core.dias_calendario'::regclass) THEN
    ALTER TABLE "core"."dias_calendario" ADD CONSTRAINT "dias_calendario_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dias_calendario_instalacion_id_fkey'
    AND conrelid = 'core.dias_calendario'::regclass) THEN
    ALTER TABLE "core"."dias_calendario" ADD CONSTRAINT "dias_calendario_instalacion_id_fkey"
      FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- La instalación de una fila del tenant es del mismo tenant (las FK de Postgres no pasan por RLS).
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."dias_calendario";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."dias_calendario"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

-- Seed de feriados nacionales de fecha fija de Chile 2026–2027 (filas de plataforma, tenant_id nulo).
-- Se cargan AQUÍ, antes de activar RLS, para que la inserción no dependa de que el rol de deploy sea
-- BYPASSRLS (en Neon puede no serlo). Idempotente (WHERE NOT EXISTS por fecha). Solo las fechas fijas
-- por estatuto; irrenunciable según la Ley 19.973 (1-ene, 1-may, 18 y 19-sep, 25-dic). Los feriados
-- de fecha movible (Semana Santa, San Pedro y San Pablo, Pueblos Indígenas, Encuentro de Dos Mundos,
-- Iglesias Evangélicas) quedan fuera hasta confirmar la fecha observada de cada año con la ley
-- publicada (ver «[dato a confirmar]» del brief CAR-79): los agrega la plataforma por este mismo
-- camino. La lista se revisa cada año; no hay API externa en la v1.
INSERT INTO "core"."dias_calendario" ("id", "tenant_id", "fecha", "tipo", "nombre", "irrenunciable", "region", "instalacion_id", "fuente")
SELECT gen_random_uuid(), NULL, v.fecha::date, 'feriado', v.nombre, v.irr, NULL, NULL, 'nacional'
FROM (VALUES
  ('2026-01-01', 'Año Nuevo', true),
  ('2026-05-01', 'Día Nacional del Trabajo', true),
  ('2026-05-21', 'Día de las Glorias Navales', false),
  ('2026-07-16', 'Día de la Virgen del Carmen', false),
  ('2026-08-15', 'Asunción de la Virgen', false),
  ('2026-09-18', 'Independencia Nacional', true),
  ('2026-09-19', 'Día de las Glorias del Ejército', true),
  ('2026-11-01', 'Día de Todos los Santos', false),
  ('2026-12-08', 'Inmaculada Concepción', false),
  ('2026-12-25', 'Navidad', true),
  ('2027-01-01', 'Año Nuevo', true),
  ('2027-05-01', 'Día Nacional del Trabajo', true),
  ('2027-05-21', 'Día de las Glorias Navales', false),
  ('2027-07-16', 'Día de la Virgen del Carmen', false),
  ('2027-08-15', 'Asunción de la Virgen', false),
  ('2027-09-18', 'Independencia Nacional', true),
  ('2027-09-19', 'Día de las Glorias del Ejército', true),
  ('2027-11-01', 'Día de Todos los Santos', false),
  ('2027-12-08', 'Inmaculada Concepción', false),
  ('2027-12-25', 'Navidad', true)
) AS v(fecha, nombre, irr)
WHERE NOT EXISTS (
  SELECT 1 FROM "core"."dias_calendario" d
  WHERE d.tenant_id IS NULL AND d.region IS NULL AND d.fecha = v.fecha::date
);

-- Permisos del rol de aplicación sobre la tabla nueva (los ALTER DEFAULT PRIVILEGES del schema core
-- ya los darían; explícito como en las migraciones de core que crean tablas).
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."dias_calendario" TO opai_app;

-- Row-Level Security: aislamiento por tenant + lectura de las filas de plataforma.
ALTER TABLE "core"."dias_calendario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."dias_calendario" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."dias_calendario";
CREATE POLICY tenant_isolation ON "core"."dias_calendario" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
-- Las filas de plataforma (tenant_id nulo) se leen desde cualquier tenant; no se pueden escribir
-- (ninguna política las habilita para INSERT/UPDATE/DELETE de opai_app).
DROP POLICY IF EXISTS plataforma_lectura ON "core"."dias_calendario";
CREATE POLICY plataforma_lectura ON "core"."dias_calendario" AS PERMISSIVE FOR SELECT TO opai_app
  USING (tenant_id IS NULL);

COMMIT;

-- Reversión: requiere snapshot. No borra datos automáticamente.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- DROP TABLE IF EXISTS "core"."dias_calendario";
-- COMMIT;
