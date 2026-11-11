-- CAR-138 (PR 9) · Plantillas HTML de propuesta importadas por la empresa: HTML ya saneado por el servidor, con
-- marcadores del catálogo de campos, versionado por nombre. ADITIVA: tabla nueva y vacía; no toca tablas existentes
-- ni migra datos. RLS ENABLE + FORCE con `tenant_isolation`. El contenido es inmutable: solo `estado` puede cambiar.
-- Hoy ningún renderer la consume (el PDF sigue siendo `pdf-lib`).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "cpq"."propuesta_html" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "html_saneado" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "catalogo_version" INTEGER NOT NULL,
    "tokens_usados" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "colecciones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "advertencias" JSONB NOT NULL DEFAULT '[]',
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "propuesta_html_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "propuesta_html_nombre_check" CHECK (char_length(btrim("nombre")) BETWEEN 1 AND 120),
    CONSTRAINT "propuesta_html_version_check" CHECK ("version" >= 1),
    CONSTRAINT "propuesta_html_estado_check" CHECK ("estado" IN ('activa', 'archivada')),
    CONSTRAINT "propuesta_html_html_check" CHECK (char_length("html_saneado") BETWEEN 1 AND 400000),
    CONSTRAINT "propuesta_html_hash_check" CHECK ("hash_sha256" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "propuesta_html_tenant_id_nombre_version_key" ON "cpq"."propuesta_html"("tenant_id", "nombre", "version");
CREATE INDEX "propuesta_html_tenant_id_nombre_estado_idx" ON "cpq"."propuesta_html"("tenant_id", "nombre", "estado");
-- Una sola versión activa por nombre y empresa.
CREATE UNIQUE INDEX "propuesta_html_activa_key" ON "cpq"."propuesta_html"("tenant_id", "nombre") WHERE "estado" = 'activa';

ALTER TABLE "cpq"."propuesta_html" ADD CONSTRAINT "propuesta_html_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Inmutabilidad: el HTML saneado, su hash y sus marcadores no cambian; una versión nueva es una fila nueva.
CREATE FUNCTION "cpq"."propuesta_html_inmutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.nombre IS DISTINCT FROM OLD.nombre
     OR NEW.version IS DISTINCT FROM OLD.version OR NEW.html_saneado IS DISTINCT FROM OLD.html_saneado
     OR NEW.hash_sha256 IS DISTINCT FROM OLD.hash_sha256 OR NEW.catalogo_version IS DISTINCT FROM OLD.catalogo_version
     OR NEW.tokens_usados IS DISTINCT FROM OLD.tokens_usados OR NEW.colecciones IS DISTINCT FROM OLD.colecciones
     OR NEW.advertencias IS DISTINCT FROM OLD.advertencias OR NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id THEN
    RAISE EXCEPTION 'cpq.propuesta_html es inmutable salvo el estado' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER propuesta_html_inmutable BEFORE UPDATE ON "cpq"."propuesta_html"
  FOR EACH ROW EXECUTE FUNCTION "cpq"."propuesta_html_inmutable"();

ALTER TABLE "cpq"."propuesta_html" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."propuesta_html" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."propuesta_html" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: DROP TABLE "cpq"."propuesta_html"; DROP FUNCTION "cpq"."propuesta_html_inmutable"();
-- (solo guarda plantillas importadas; ninguna otra tabla depende de ella).
