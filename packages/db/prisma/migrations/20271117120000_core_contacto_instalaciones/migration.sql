-- CAR-608: contactos vinculados a instalaciones con roles operacionales (ADR-040 §5).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."contacto_instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contacto_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contacto_instalaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contacto_instalaciones_roles_check" CHECK (
      cardinality("roles") > 0
      AND "roles" <@ ARRAY['jefe_sitio','recibe_reportes','autoriza_visitas','emergencia']::text[]
    )
);

CREATE UNIQUE INDEX "contacto_instalaciones_tenant_id_contacto_id_instalacion_id_key"
    ON "core"."contacto_instalaciones"("tenant_id", "contacto_id", "instalacion_id");
CREATE INDEX "contacto_instalaciones_tenant_id_instalacion_id_idx"
    ON "core"."contacto_instalaciones"("tenant_id", "instalacion_id");

ALTER TABLE "core"."contacto_instalaciones" ADD CONSTRAINT "contacto_instalaciones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."contacto_instalaciones" ADD CONSTRAINT "contacto_instalaciones_contacto_id_fkey"
    FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."contacto_instalaciones" ADD CONSTRAINT "contacto_instalaciones_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."contacto_instalaciones" TO opai_app;
ALTER TABLE "core"."contacto_instalaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."contacto_instalaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."contacto_instalaciones" AS PERMISSIVE FOR ALL TO opai_app
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."contacto_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'contacto_id', 'core.contactos', 'instalacion_id', 'core.instalaciones');

-- Exige vínculo contacto–cuenta con la cuenta de la instalación (ADR-040 §5).
CREATE OR REPLACE FUNCTION "core"."verificar_contacto_instalacion_cuenta"() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  cuenta_inst uuid;
  ok boolean;
BEGIN
  SELECT cuenta_id INTO cuenta_inst FROM "core"."instalaciones" WHERE id = NEW.instalacion_id;
  IF cuenta_inst IS NULL THEN
    RAISE EXCEPTION 'instalacion_id no visible para el tenant actual'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM "core"."contacto_cuentas" cc
    WHERE cc.contacto_id = NEW.contacto_id AND cc.cuenta_id = cuenta_inst
  ) OR EXISTS (
    SELECT 1 FROM "core"."contactos" c
    WHERE c.id = NEW.contacto_id AND c.cuenta_id = cuenta_inst
  ) INTO ok;
  IF NOT ok THEN
    RAISE EXCEPTION 'contacto_instalaciones: el contacto debe estar vinculado a la cuenta de la instalación'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "core"."verificar_contacto_instalacion_cuenta"() FROM PUBLIC;
CREATE TRIGGER cuenta_instalacion BEFORE INSERT OR UPDATE ON "core"."contacto_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_contacto_instalacion_cuenta"();

COMMIT;