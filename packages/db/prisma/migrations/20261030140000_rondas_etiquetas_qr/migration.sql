-- Brief 14 · Rondas PR 2: historial de etiquetas QR con firma y estado (R7). Migración ADITIVA e
-- IDEMPOTENTE: solo crea la tabla nueva `rondas.etiquetas_qr`, sus índices, su FK, su política de RLS
-- y su trigger de mismo tenant; nada destructivo sobre tablas existentes. Toda tabla con tenant_id
-- lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS. No migra datos de
-- negocio (no toca filas existentes): los puntos de 1.0 se importan aparte con el script en solo
-- lectura `packages/db/scripts/importar-rondas-etiquetas/` (corrección de la review 5713377140 del
-- PR #145: el nombre anterior de este comentario citaba un script que nunca existió), nunca en esta
-- migración.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateTable
CREATE TABLE IF NOT EXISTS "rondas"."etiquetas_qr" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "punto_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "firmada" BOOLEAN NOT NULL DEFAULT true,
    "origen" TEXT NOT NULL DEFAULT 'generada',
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "reemplazada_en" TIMESTAMPTZ(6),
    "reemplazada_por" UUID,
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "etiquetas_qr_pkey" PRIMARY KEY ("id")
);

-- Un código es único por tenant en todo el historial: leer cualquier etiqueta (vigente o
-- reemplazada) resuelve a un solo punto (R7, R8).
CREATE UNIQUE INDEX IF NOT EXISTS "etiquetas_qr_tenant_id_codigo_key"
    ON "rondas"."etiquetas_qr"("tenant_id", "codigo");
-- A lo sumo una etiqueta vigente por punto (el reemplazo deja la anterior como `reemplazada`).
CREATE UNIQUE INDEX IF NOT EXISTS "etiquetas_qr_tenant_id_punto_id_vigente_key"
    ON "rondas"."etiquetas_qr"("tenant_id", "punto_id") WHERE "estado" = 'vigente';
CREATE INDEX IF NOT EXISTS "etiquetas_qr_tenant_id_punto_id_idx"
    ON "rondas"."etiquetas_qr"("tenant_id", "punto_id");

-- AddForeignKey (idempotente: solo si falta)
DO $$ BEGIN
  ALTER TABLE "rondas"."etiquetas_qr"
    ADD CONSTRAINT "etiquetas_qr_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "rondas"."etiquetas_qr"
    ADD CONSTRAINT "etiquetas_qr_punto_id_fkey"
    FOREIGN KEY ("punto_id") REFERENCES "rondas"."puntos_control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permisos del rol de aplicación sobre la tabla nueva (los ALTER DEFAULT PRIVILEGES del schema
-- rondas ya los darían; explícito como en las demás tablas del schema, corrección de la review
-- 5713377140 del PR #145).
GRANT SELECT, INSERT, UPDATE, DELETE ON "rondas"."etiquetas_qr" TO opai_app;

-- Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS).
ALTER TABLE "rondas"."etiquetas_qr" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."etiquetas_qr" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "rondas"."etiquetas_qr";
CREATE POLICY tenant_isolation ON "rondas"."etiquetas_qr" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencia dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`).
DROP TRIGGER IF EXISTS mismo_tenant ON "rondas"."etiquetas_qr";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rondas"."etiquetas_qr"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('punto_id', 'rondas.puntos_control');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE "rondas"."etiquetas_qr" CASCADE;
-- Elimina la tabla, sus índices, su FK, su trigger y la política tenant_isolation.
