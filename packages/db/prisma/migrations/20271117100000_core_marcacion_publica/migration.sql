-- CAR-606: enlace o QR público por instalación (`/marcar/[codigo]`). Código persistente rotativo;
-- resolución antes de fijar empresa por función SECURITY DEFINER (como emparejamiento de dispositivos).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."codigos_marcacion_publica" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "codigos_marcacion_publica_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "codigos_marcacion_publica_codigo_hash_key" ON "core"."codigos_marcacion_publica"("codigo_hash");
CREATE UNIQUE INDEX "codigos_marcacion_publica_instalacion_id_key" ON "core"."codigos_marcacion_publica"("instalacion_id");
CREATE INDEX "codigos_marcacion_publica_tenant_id_idx" ON "core"."codigos_marcacion_publica"("tenant_id");
ALTER TABLE "core"."codigos_marcacion_publica" ADD CONSTRAINT "codigos_marcacion_publica_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."codigos_marcacion_publica" ADD CONSTRAINT "codigos_marcacion_publica_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."codigos_marcacion_publica" TO opai_app;

ALTER TABLE "core"."codigos_marcacion_publica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."codigos_marcacion_publica" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."codigos_marcacion_publica" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."codigos_marcacion_publica"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

CREATE OR REPLACE FUNCTION "core"."marcacion_publica_por_codigo"(p_codigo_hash text)
RETURNS TABLE(tenant_id uuid, instalacion_id uuid, instalacion_nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT c.tenant_id, c.instalacion_id, i.nombre
  FROM "core"."codigos_marcacion_publica" c
  JOIN "core"."instalaciones" i ON i.id = c.instalacion_id AND i.tenant_id = c.tenant_id
  WHERE c.codigo_hash = p_codigo_hash
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION "core"."marcacion_publica_por_codigo"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."marcacion_publica_por_codigo"(text) TO opai_app;

COMMIT;