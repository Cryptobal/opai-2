-- Brief 14 · Rondas PR 1: schema `rondas` con puntos de control, plantillas, plantilla_puntos,
-- programaciones, tipos de incidente y el modelo mínimo de Novedad (decisión de Carlos 29-oct-2026
-- 17:03 CLT). Migración ADITIVA: solo crea objetos nuevos, sin DROP ni cambios destructivos en
-- tablas existentes. Toda tabla con tenant_id lleva RLS `tenant_isolation` (ENABLE + FORCE) para
-- opai_app, que es NOBYPASSRLS. Las tablas de hechos (ejecuciones, marcas, rastro) llegan en el PR 3.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rondas";

-- CreateTable
CREATE TABLE "rondas"."puntos_control" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "modo" TEXT NOT NULL DEFAULT 'qr_gps',
    "estricto" BOOLEAN NOT NULL DEFAULT false,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),
    "radio_m" INTEGER,
    "precision_min_m" INTEGER,
    "permanencia_s" INTEGER NOT NULL DEFAULT 0,
    "etiqueta_qr" TEXT,
    "exige_foto" BOOLEAN NOT NULL DEFAULT false,
    "instrucciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "puntos_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas"."plantillas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden_modo" TEXT NOT NULL DEFAULT 'sugerido',
    "tiempo_max_min" INTEGER NOT NULL,
    "tiempo_max_tramo_min" INTEGER,
    "umbral_incompleta_pct" INTEGER NOT NULL DEFAULT 20,
    "permite_adhoc" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas"."plantilla_puntos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plantilla_id" UUID NOT NULL,
    "punto_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plantilla_puntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas"."programaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "plantilla_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "horarios" JSONB NOT NULL DEFAULT '[]',
    "dias_semana" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "vigencia_desde" DATE,
    "vigencia_hasta" DATE,
    "tolerancia_min" INTEGER NOT NULL DEFAULT 15,
    "responsables" JSONB NOT NULL DEFAULT '{"modo":"personas","personaIds":[]}',
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "programaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas"."tipos_incidente" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,
    "gravedad_defecto" TEXT NOT NULL DEFAULT 'media',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tipos_incidente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas"."novedades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "ejecucion_id" UUID,
    "punto_id" UUID,
    "tipo_incidente_id" UUID,
    "gravedad" TEXT NOT NULL DEFAULT 'media',
    "codigo" TEXT,
    "resumen" TEXT NOT NULL,
    "detalle" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "novedades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puntos_control_tenant_id_instalacion_id_idx" ON "rondas"."puntos_control"("tenant_id", "instalacion_id");
CREATE UNIQUE INDEX "puntos_control_tenant_id_instalacion_id_nombre_key" ON "rondas"."puntos_control"("tenant_id", "instalacion_id", "nombre") WHERE "estado" = 'activo';
CREATE UNIQUE INDEX "puntos_control_tenant_id_etiqueta_qr_key" ON "rondas"."puntos_control"("tenant_id", "etiqueta_qr") WHERE "etiqueta_qr" IS NOT NULL;

CREATE INDEX "plantillas_tenant_id_instalacion_id_idx" ON "rondas"."plantillas"("tenant_id", "instalacion_id");
CREATE UNIQUE INDEX "plantillas_tenant_id_instalacion_id_nombre_key" ON "rondas"."plantillas"("tenant_id", "instalacion_id", "nombre") WHERE "estado" = 'activo';

CREATE INDEX "plantilla_puntos_tenant_id_plantilla_id_idx" ON "rondas"."plantilla_puntos"("tenant_id", "plantilla_id");
CREATE UNIQUE INDEX "plantilla_puntos_tenant_id_plantilla_id_punto_id_key" ON "rondas"."plantilla_puntos"("tenant_id", "plantilla_id", "punto_id");
CREATE UNIQUE INDEX "plantilla_puntos_tenant_id_plantilla_id_orden_key" ON "rondas"."plantilla_puntos"("tenant_id", "plantilla_id", "orden");

CREATE INDEX "programaciones_tenant_id_instalacion_id_idx" ON "rondas"."programaciones"("tenant_id", "instalacion_id");
CREATE INDEX "programaciones_tenant_id_plantilla_id_idx" ON "rondas"."programaciones"("tenant_id", "plantilla_id");

CREATE INDEX "tipos_incidente_tenant_id_idx" ON "rondas"."tipos_incidente"("tenant_id");
CREATE UNIQUE INDEX "tipos_incidente_tenant_id_nombre_key" ON "rondas"."tipos_incidente"("tenant_id", "nombre") WHERE "activo";

CREATE INDEX "novedades_tenant_id_instalacion_id_idx" ON "rondas"."novedades"("tenant_id", "instalacion_id");
CREATE UNIQUE INDEX "novedades_tenant_id_idempotency_key_key" ON "rondas"."novedades"("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "rondas"."puntos_control" ADD CONSTRAINT "puntos_control_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."puntos_control" ADD CONSTRAINT "puntos_control_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rondas"."plantillas" ADD CONSTRAINT "plantillas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."plantillas" ADD CONSTRAINT "plantillas_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rondas"."plantilla_puntos" ADD CONSTRAINT "plantilla_puntos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."plantilla_puntos" ADD CONSTRAINT "plantilla_puntos_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "rondas"."plantillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rondas"."plantilla_puntos" ADD CONSTRAINT "plantilla_puntos_punto_id_fkey" FOREIGN KEY ("punto_id") REFERENCES "rondas"."puntos_control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rondas"."programaciones" ADD CONSTRAINT "programaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."programaciones" ADD CONSTRAINT "programaciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."programaciones" ADD CONSTRAINT "programaciones_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "rondas"."plantillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rondas"."tipos_incidente" ADD CONSTRAINT "tipos_incidente_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rondas"."novedades" ADD CONSTRAINT "novedades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."novedades" ADD CONSTRAINT "novedades_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."novedades" ADD CONSTRAINT "novedades_punto_id_fkey" FOREIGN KEY ("punto_id") REFERENCES "rondas"."puntos_control"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rondas"."novedades" ADD CONSTRAINT "novedades_tipo_incidente_id_fkey" FOREIGN KEY ("tipo_incidente_id") REFERENCES "rondas"."tipos_incidente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "rondas" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "rondas" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "rondas" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "rondas" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "rondas" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "rondas"."puntos_control" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."puntos_control" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."puntos_control" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rondas"."plantillas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."plantillas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."plantillas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rondas"."plantilla_puntos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."plantilla_puntos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."plantilla_puntos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rondas"."programaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."programaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."programaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rondas"."tipos_incidente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."tipos_incidente" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."tipos_incidente" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rondas"."novedades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."novedades" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."novedades" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`).
-- ejecucion_id de novedades queda sin verificar hasta que el PR 3 cree `rondas.ejecuciones`.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rondas"."puntos_control"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rondas"."plantillas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rondas"."plantilla_puntos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('plantilla_id', 'rondas.plantillas', 'punto_id', 'rondas.puntos_control');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rondas"."programaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones', 'plantilla_id', 'rondas.plantillas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rondas"."novedades"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones', 'punto_id', 'rondas.puntos_control', 'tipo_incidente_id', 'rondas.tipos_incidente');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): sin datos de negocio que migrar
-- (el schema es nuevo), basta con:
--   DROP SCHEMA "rondas" CASCADE;
-- Elimina las 5 tablas, sus índices, FKs, triggers y la política tenant_isolation de cada una, y
-- revoca los GRANT/ALTER DEFAULT PRIVILEGES sobre el schema al desaparecer. Exige haber revertido
-- antes el código del módulo (manifest y capacidades `rondas.*`) para que nada siga escribiendo ahí.
