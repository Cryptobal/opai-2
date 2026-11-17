-- CAR-594 · Portal de fiscalización DT, accesos de mandante/EST y respaldos de bitácora (P06–P09).
-- Aditiva: tablas nuevas en `asistencia`, RLS tenant_isolation y funciones SECURITY DEFINER para
-- resolver empleador por RUT y clave temporal antes de fijar `app.tenant_id`.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "asistencia"."fiscalizacion_claves" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "clave_hash" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "revocado_en" TIMESTAMPTZ(6),
    "revocado_por_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fiscalizacion_claves_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fiscalizacion_claves_correo_chk" CHECK (position('@' in "correo") > 1)
);
CREATE UNIQUE INDEX "fiscalizacion_claves_clave_hash_key" ON "asistencia"."fiscalizacion_claves"("clave_hash");
CREATE INDEX "fiscalizacion_claves_tenant_id_correo_idx" ON "asistencia"."fiscalizacion_claves"("tenant_id", "correo");

CREATE TABLE "asistencia"."fiscalizacion_accesos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "empleador_rut" TEXT NOT NULL,
    "ip" TEXT,
    "via" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fiscalizacion_accesos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fiscalizacion_accesos_via_chk" CHECK ("via" IN ('correo', 'clave'))
);
CREATE INDEX "fiscalizacion_accesos_tenant_id_created_at_idx" ON "asistencia"."fiscalizacion_accesos"("tenant_id", "created_at");

CREATE TABLE "asistencia"."mandante_accesos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "todas_instalaciones" BOOLEAN NOT NULL DEFAULT false,
    "creado_por_id" UUID NOT NULL,
    "revocado_por_id" UUID,
    "revocado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "mandante_accesos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mandante_accesos_tipo_chk" CHECK ("tipo" IN ('mandante', 'est')),
    CONSTRAINT "mandante_accesos_estado_chk" CHECK ("estado" IN ('activo', 'revocado'))
);
CREATE INDEX "mandante_accesos_tenant_id_cuenta_id_idx" ON "asistencia"."mandante_accesos"("tenant_id", "cuenta_id");
CREATE INDEX "mandante_accesos_tenant_id_correo_idx" ON "asistencia"."mandante_accesos"("tenant_id", "correo");

CREATE TABLE "asistencia"."mandante_acceso_instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "acceso_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mandante_acceso_instalaciones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mandante_acceso_instalaciones_acceso_id_instalacion_id_key"
  ON "asistencia"."mandante_acceso_instalaciones"("acceso_id", "instalacion_id");
CREATE INDEX "mandante_acceso_instalaciones_tenant_id_instalacion_id_idx"
  ON "asistencia"."mandante_acceso_instalaciones"("tenant_id", "instalacion_id");

CREATE TABLE "asistencia"."mandante_acceso_eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "acceso_id" UUID NOT NULL,
    "actor_id" UUID,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mandante_acceso_eventos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mandante_acceso_eventos_tenant_id_acceso_id_created_at_idx"
  ON "asistencia"."mandante_acceso_eventos"("tenant_id", "acceso_id", "created_at");

CREATE TABLE "asistencia"."respaldos_bitacora" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "origen" TEXT NOT NULL,
    "manifiesto_sha256" TEXT NOT NULL,
    "documento_id" UUID NOT NULL,
    "total_marcas" INTEGER NOT NULL,
    "desde_seq" INTEGER NOT NULL,
    "hasta_seq" INTEGER NOT NULL,
    "cadena_verificada_ok" BOOLEAN NOT NULL,
    "generado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "respaldos_bitacora_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "respaldos_bitacora_origen_chk" CHECK ("origen" IN ('manual', 'automatico')),
    CONSTRAINT "respaldos_bitacora_seq_chk" CHECK ("desde_seq" >= 1 AND "hasta_seq" >= "desde_seq")
);
CREATE INDEX "respaldos_bitacora_tenant_id_created_at_idx" ON "asistencia"."respaldos_bitacora"("tenant_id", "created_at");

-- RLS
DO $rls$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fiscalizacion_claves', 'fiscalizacion_accesos', 'mandante_accesos',
    'mandante_acceso_instalaciones', 'mandante_acceso_eventos', 'respaldos_bitacora'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON asistencia.%I TO opai_app', t);
    EXECUTE format('ALTER TABLE asistencia.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE asistencia.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON asistencia.%I AS PERMISSIVE FOR ALL TO opai_app '
      || 'USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) '
      || 'WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $rls$;

-- Auditoría de fiscalización: solo INSERT (sin UPDATE ni DELETE).
REVOKE UPDATE, DELETE, TRUNCATE ON "asistencia"."fiscalizacion_accesos" FROM opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "asistencia"."mandante_acceso_eventos" FROM opai_app;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "asistencia"."mandante_accesos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."mandante_acceso_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'acceso_id', 'asistencia.mandante_accesos', 'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "asistencia"."respaldos_bitacora"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'core.documentos');

ALTER TABLE "asistencia"."mandante_acceso_instalaciones"
  ADD CONSTRAINT "mandante_acceso_instalaciones_acceso_id_fkey"
  FOREIGN KEY ("acceso_id") REFERENCES "asistencia"."mandante_accesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asistencia"."mandante_acceso_eventos"
  ADD CONSTRAINT "mandante_acceso_eventos_acceso_id_fkey"
  FOREIGN KEY ("acceso_id") REFERENCES "asistencia"."mandante_accesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Empleador por RUT (portal de fiscalización, sin tenant previo).
CREATE OR REPLACE FUNCTION "asistencia"."empleador_por_rut"(p_rut text)
RETURNS TABLE(tenant_id uuid, slug text, razon_social text, rut text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT t.id, t.slug, p.razon_social, p.rut
  FROM core.perfil_empresa p
  JOIN core.tenants t ON t.id = p.tenant_id
  WHERE p.rut IS NOT NULL
    AND regexp_replace(lower(p.rut), '[^0-9k]', '', 'g') = regexp_replace(lower(p_rut), '[^0-9k]', '', 'g')
    AND t.estado IN ('activo', 'trial')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION "asistencia"."empleador_por_rut"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "asistencia"."empleador_por_rut"(text) TO opai_app;

-- Clave temporal de fiscalización (hash exacto).
CREATE OR REPLACE FUNCTION "asistencia"."fiscalizacion_resolver_clave"(p_clave_hash text)
RETURNS TABLE(
  tenant_id uuid, clave_id uuid, correo text, vence_en timestamptz, revocado_en timestamptz, usos int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT c.tenant_id, c.id, c.correo, c.vence_en, c.revocado_en, c.usos
  FROM asistencia.fiscalizacion_claves c
  WHERE c.clave_hash = p_clave_hash
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION "asistencia"."fiscalizacion_resolver_clave"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "asistencia"."fiscalizacion_resolver_clave"(text) TO opai_app;

COMMIT;