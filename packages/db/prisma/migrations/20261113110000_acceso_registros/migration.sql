-- CAR-78 · E4b: Control de acceso (portería). Migración ADITIVA: schema nuevo `acceso` con cuatro tablas.
--   · entradas_lista       listas autorizada/bloqueada (editables, con RLS).
--   · registros_acceso     entrada de una persona o vehículo (SOLO INSERCIÓN: un hecho no se edita).
--   · salidas_acceso       salida de un registro (SOLO INSERCIÓN, una por registro).
--   · intentos_denegados   quien no pudo entrar y por qué (SOLO INSERCIÓN).
-- Minimización (Ley 21.719, decisión de Carlos 7-nov-2026): del documento solo se guarda su HUELLA (HMAC con la
-- clave de plataforma ACCESO_HUELLA_SECRET, versionada por `huella_kid`) y su MÁSCARA; nunca el número completo.
-- La migración no contiene ni necesita la clave.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS "acceso";
GRANT USAGE ON SCHEMA "acceso" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "acceso" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "acceso" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

CREATE TABLE "acceso"."entradas_lista" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "doc_tipo" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "huella_kid" TEXT NOT NULL,
    "mascara" TEXT NOT NULL,
    "nombre" TEXT,
    "motivo" TEXT,
    "tipos_registro" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vigente_desde" TIMESTAMPTZ(6),
    "vigente_hasta" TIMESTAMPTZ(6),
    "dias" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "desde_min" INTEGER,
    "hasta_min" INTEGER,
    "uso_unico" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "entradas_lista_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "entradas_lista_busqueda_idx" ON "acceso"."entradas_lista"("tenant_id", "instalacion_id", "doc_tipo", "huella");

CREATE TABLE "acceso"."registros_acceso" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "persona_id" UUID,
    "tipo_registro" TEXT NOT NULL,
    "doc_tipo" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "huella_kid" TEXT NOT NULL,
    "mascara" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "motivo_visita" TEXT,
    "patente" TEXT,
    "entrada_lista_id" UUID,
    "origen" TEXT NOT NULL DEFAULT 'en_linea',
    "hora_corregida" TIMESTAMPTZ(6) NOT NULL,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registros_acceso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registros_acceso_clave_key" ON "acceso"."registros_acceso"("tenant_id", "dispositivo_id", "clave");
CREATE INDEX "registros_acceso_sitio_idx" ON "acceso"."registros_acceso"("tenant_id", "instalacion_id", "hora_corregida" DESC);
CREATE INDEX "registros_acceso_huella_idx" ON "acceso"."registros_acceso"("tenant_id", "doc_tipo", "huella");

CREATE TABLE "acceso"."salidas_acceso" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "registro_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "persona_id" UUID,
    "hora_corregida" TIMESTAMPTZ(6) NOT NULL,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salidas_acceso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "salidas_acceso_registro_key" ON "acceso"."salidas_acceso"("registro_id");
CREATE UNIQUE INDEX "salidas_acceso_clave_key" ON "acceso"."salidas_acceso"("tenant_id", "dispositivo_id", "clave");

CREATE TABLE "acceso"."intentos_denegados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "persona_id" UUID,
    "tipo_registro" TEXT NOT NULL,
    "doc_tipo" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "huella_kid" TEXT NOT NULL,
    "mascara" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "hora_corregida" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intentos_denegados_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "intentos_denegados_clave_key" ON "acceso"."intentos_denegados"("tenant_id", "dispositivo_id", "clave");

ALTER TABLE "acceso"."salidas_acceso" ADD CONSTRAINT "salidas_acceso_registro_fkey" FOREIGN KEY ("registro_id") REFERENCES "acceso"."registros_acceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."registros_acceso" ADD CONSTRAINT "registros_acceso_lista_fkey" FOREIGN KEY ("entrada_lista_id") REFERENCES "acceso"."entradas_lista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['entradas_lista', 'registros_acceso', 'salidas_acceso', 'intentos_denegados'] LOOP
    EXECUTE format('ALTER TABLE "acceso".%I ADD CONSTRAINT %I FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_tenant_id_fkey');
    EXECUTE format('ALTER TABLE "acceso".%I ADD CONSTRAINT %I FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_instalacion_id_fkey');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "acceso".%I TO opai_app', t);
    EXECUTE format('ALTER TABLE "acceso".%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE "acceso".%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON "acceso".%I AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  END LOOP;
  -- Hechos: solo inserción para opai_app (una corrección es un hecho nuevo, ADR-023).
  FOREACH t IN ARRAY ARRAY['registros_acceso', 'salidas_acceso', 'intentos_denegados'] LOOP
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON "acceso".%I FROM opai_app', t);
  END LOOP;
END $$;

-- Instalación, dispositivo, persona, registro y entrada de lista deben ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."entradas_lista" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "acceso"."registros_acceso" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones',
  'entrada_lista_id', 'acceso.entradas_lista');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "acceso"."salidas_acceso" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas', 'registro_id', 'acceso.registros_acceso',
  'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "acceso"."intentos_denegados" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP SCHEMA "acceso" CASCADE;
-- Borra las cuatro tablas, sus políticas y triggers. Con registros ya hechos se perdería el historial de acceso:
-- ante la duda, restaura desde el snapshot previo de Neon.
