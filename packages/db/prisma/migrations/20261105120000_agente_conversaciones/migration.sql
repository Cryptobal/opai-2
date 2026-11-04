-- Qué hace y por qué: CAR-120 PR 5b (spec agente R19). Guarda las conversaciones del agente interno,
-- privadas de cada persona y aisladas por empresa. ADITIVA: tabla nueva con RLS; el alcance por
-- persona (user_id) lo aplican las capacidades `agente.conversaciones.*`.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."agente_conversaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "contexto_tipo" TEXT,
    "contexto_id" UUID,
    "mensajes" JSONB NOT NULL DEFAULT '[]',
    "acciones_hechas" INTEGER NOT NULL DEFAULT 0,
    "archivada_en" TIMESTAMPTZ(6),
    "ultima_actividad" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agente_conversaciones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agente_conversaciones_tenant_id_user_id_ultima_actividad_idx"
  ON "core"."agente_conversaciones"("tenant_id", "user_id", "ultima_actividad" DESC);
ALTER TABLE "core"."agente_conversaciones" ADD CONSTRAINT "agente_conversaciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."agente_conversaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."agente_conversaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."agente_conversaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: snapshot Neon previo. A mano solo sirve mientras nadie dependa de las conversaciones
-- guardadas (el DROP las pierde):
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- DROP TABLE IF EXISTS "core"."agente_conversaciones";
-- COMMIT;
