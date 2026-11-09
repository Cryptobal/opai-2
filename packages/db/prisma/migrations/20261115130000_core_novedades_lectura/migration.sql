-- Núcleo · Novedades in-app: estado de lectura por usuario (contenido global en el repositorio).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."novedades_lectura" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "novedad_id" TEXT NOT NULL,
    "leida_en" TIMESTAMPTZ(6),
    "destacada_descartada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "novedades_lectura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "novedades_lectura_tenant_usuario_novedad_key"
  ON "core"."novedades_lectura"("tenant_id", "usuario_id", "novedad_id");
CREATE INDEX "novedades_lectura_tenant_usuario_leida_idx"
  ON "core"."novedades_lectura"("tenant_id", "usuario_id", "leida_en");

ALTER TABLE "core"."novedades_lectura" ADD CONSTRAINT "novedades_lectura_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."novedades_lectura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."novedades_lectura" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."novedades_lectura" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
-- Defensa en profundidad: lecturas/escrituras solo de la fila del usuario en sesión (`app.user_id`).
CREATE POLICY usuario_propia ON "core"."novedades_lectura" AS RESTRICTIVE FOR ALL TO opai_app
  USING (usuario_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (usuario_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "usuario_id", "tenant_id" ON "core"."novedades_lectura"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('usuario_id');

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "core"."novedades_lectura";
