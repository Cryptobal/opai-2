-- Núcleo · CAR-292 (Slack F2, ADR-093): vínculo usuario de OPAI ↔ usuario de Slack por empresa.
-- Migración aditiva: una tabla nueva sin datos. No toca nada existente.
--   · core.slack_usuarios: una fila por persona interna de la empresa revisada contra Slack, con su
--     estado («vinculado» o «sin_vincular») y, si está vinculada, su id de usuario de Slack.
--   · La llave foránea compuesta (tenant_id, user_id) → core.memberships impide ligar a alguien que
--     no es miembro de la empresa: nunca hay vínculos entre empresas.
--   · Un usuario de Slack queda ligado a lo más a una persona por empresa (índice único parcial).
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."slack_usuarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "estado" TEXT NOT NULL,
    "slack_user_id" TEXT,
    "motivo" TEXT,
    "revisado_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slack_usuarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slack_usuarios_estado_check" CHECK ("estado" IN ('vinculado', 'sin_vincular')),
    CONSTRAINT "slack_usuarios_slack_user_id_check" CHECK (
      ("estado" = 'vinculado' AND "slack_user_id" ~ '^[UW][A-Z0-9]{4,}$')
      OR ("estado" = 'sin_vincular' AND "slack_user_id" IS NULL)
    )
);

CREATE UNIQUE INDEX "slack_usuarios_tenant_id_user_id_key" ON "core"."slack_usuarios"("tenant_id", "user_id");
CREATE UNIQUE INDEX "slack_usuarios_tenant_id_slack_user_id_key" ON "core"."slack_usuarios"("tenant_id", "slack_user_id")
  WHERE "slack_user_id" IS NOT NULL;
CREATE INDEX "slack_usuarios_tenant_id_estado_idx" ON "core"."slack_usuarios"("tenant_id", "estado");

-- Si la membresía se borra, su vínculo se va con ella (es un dato derivado).
ALTER TABLE "core"."slack_usuarios" ADD CONSTRAINT "slack_usuarios_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "core"."memberships"("tenant_id", "user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."slack_usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."slack_usuarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."slack_usuarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "core"."slack_usuarios";
-- Solo elimina la tabla nueva; nada existente depende de ella. Los vínculos se recrean solos al
-- volver a buscar desde Configuración › Integraciones › Slack.
