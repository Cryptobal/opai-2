-- Núcleo · CAR-291 (Slack F1, ADR-093): instalación de la app de Slack «OPAI» por empresa.
-- Migración aditiva: una tabla nueva sin datos y una función SECURITY DEFINER. No toca nada existente.
--   · core.slack_instalaciones: el espacio de Slack (team_id) ligado a cada empresa. Una empresa tiene a
--     lo más una instalación y un espacio queda ligado a una sola empresa (UNIQUE global de team_id).
--     El token del bot NO vive aquí: va cifrado en core.secretos (ADR-027).
--   · core.slack_instalacion_resolver(team_id): resuelve la empresa de un evento de Slack ya firmado,
--     antes de existir tenant; devuelve solo el tenant_id de un team_id exacto.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."slack_instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" TEXT NOT NULL,
    "team_nombre" TEXT NOT NULL,
    "bot_user_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "instalado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slack_instalaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slack_instalaciones_team_id_check" CHECK ("team_id" ~ '^T[A-Z0-9]{4,}$')
);

CREATE UNIQUE INDEX "slack_instalaciones_tenant_id_key" ON "core"."slack_instalaciones"("tenant_id");
-- Un espacio de Slack queda ligado a una sola empresa (ADR-093 §10), aunque la RLS oculte la fila.
CREATE UNIQUE INDEX "slack_instalaciones_team_id_key" ON "core"."slack_instalaciones"("team_id");

ALTER TABLE "core"."slack_instalaciones" ADD CONSTRAINT "slack_instalaciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."slack_instalaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."slack_instalaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."slack_instalaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Resuelve la empresa de un evento de Slack (desinstalación, token revocado y, desde F5a, respuestas en
-- hilos). Corre sin tenant fijado, así que es SECURITY DEFINER: recibe solo un team_id exacto y devuelve
-- el tenant_id; opai_app no puede listar espacios ni leer otra columna. La firma de Slack se verifica
-- antes de llamarla.
CREATE OR REPLACE FUNCTION "core"."slack_instalacion_resolver"(p_team_id text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT s.tenant_id FROM "core"."slack_instalaciones" s
  WHERE p_team_id ~ '^T[A-Z0-9]{4,}$' AND s.team_id = p_team_id LIMIT 1
$$;
REVOKE ALL ON FUNCTION "core"."slack_instalacion_resolver"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."slack_instalacion_resolver"(text) TO opai_app;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP FUNCTION IF EXISTS "core"."slack_instalacion_resolver"(text);
--   DROP TABLE IF EXISTS "core"."slack_instalaciones";
-- Solo elimina objetos nuevos de esta migración; nada existente depende de ellos. Los tokens cifrados
-- de Slack (core.secretos, proveedor «slack») se borran desconectando desde la pantalla o restaurando
-- el snapshot previo de Neon.
