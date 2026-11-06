-- CAR-78 · B1 (D-01, D-02): `core.credenciales_terreno`, el PIN de 6 dígitos de cada persona como
-- mecanismo secundario de identificación en terreno (solo el hash, nunca el PIN). Migración ADITIVA:
-- una tabla nueva con RLS `tenant_isolation` (ENABLE + FORCE) y una función SECURITY DEFINER de solo
-- lectura para que el ingreso encuentre la credencial por RUT cuando todavía no hay empresa fijada.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."credenciales_terreno" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "rut" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "pin_cambiado_en" TIMESTAMPTZ(6),
    "debe_cambiar" BOOLEAN NOT NULL DEFAULT true,
    "asignado_por" UUID,
    "asignado_en" TIMESTAMPTZ(6),
    "telefono_personal_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "credenciales_terreno_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credenciales_terreno_intentos_chk" CHECK ("intentos_fallidos" >= 0)
);

CREATE UNIQUE INDEX "credenciales_terreno_persona_id_key" ON "core"."credenciales_terreno"("persona_id");
CREATE INDEX "credenciales_terreno_tenant_id_idx" ON "core"."credenciales_terreno"("tenant_id");
CREATE INDEX "credenciales_terreno_rut_idx" ON "core"."credenciales_terreno"("rut");

ALTER TABLE "core"."credenciales_terreno" ADD CONSTRAINT "credenciales_terreno_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."credenciales_terreno" ADD CONSTRAINT "credenciales_terreno_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."credenciales_terreno" TO opai_app;

ALTER TABLE "core"."credenciales_terreno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."credenciales_terreno" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."credenciales_terreno" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La persona debe ser de la misma empresa que la credencial.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."credenciales_terreno"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');

-- Ingreso con RUT + PIN: corre antes de que exista empresa fijada, así que es SECURITY DEFINER. Solo
-- recibe un RUT canónico y devuelve (empresa, persona) de las credenciales de ese RUT: ni el hash ni
-- otra columna salen de aquí, y `opai_app` no puede listar la tabla de otra empresa. El hash y los
-- intentos se leen después, dentro de la empresa, con su RLS.
CREATE OR REPLACE FUNCTION "core"."credenciales_terreno_por_rut"(p_rut text)
RETURNS TABLE(tenant_id uuid, persona_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT c.tenant_id, c.persona_id FROM "core"."credenciales_terreno" c
  WHERE p_rut ~ '^[0-9]{1,8}-[0-9K]$' AND c.rut = p_rut
  ORDER BY c.updated_at DESC LIMIT 20
$$;
REVOKE ALL ON FUNCTION "core"."credenciales_terreno_por_rut"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."credenciales_terreno_por_rut"(text) TO opai_app;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP FUNCTION IF EXISTS "core"."credenciales_terreno_por_rut"(text);
--   DROP TABLE IF EXISTS "core"."credenciales_terreno" CASCADE;
-- Solo elimina objetos nuevos de esta migración; con PIN ya asignados, borrarlos obliga a RR. HH. a
-- asignarlos de nuevo: ante la duda, restaura desde el snapshot previo de Neon.
