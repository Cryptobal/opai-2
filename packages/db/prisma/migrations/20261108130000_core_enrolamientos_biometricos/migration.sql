-- CAR-78 · B4: rostro enrolado de una persona para el reconocimiento facial de terreno (D-02). Migración
-- ADITIVA: una tabla nueva con RLS `tenant_isolation`. OPAI no guarda la imagen ni la plantilla biométrica:
-- solo la referencia opaca del proveedor, CIFRADA (`referencia_cifrada`, campo sensible, Ley 21.719 art. 16
-- bis). Una por persona. Se puede BORRAR: revocar el consentimiento `biometria_asistencia` elimina la fila.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."enrolamientos_biometricos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "consentimiento_id" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referencia_cifrada" TEXT NOT NULL,
    "enrolado_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "enrolamientos_biometricos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enrolamientos_biometricos_proveedor_chk" CHECK (length("proveedor") BETWEEN 1 AND 40),
    -- Solo se guarda cifrado: un valor en claro no entra (formato de `cifrado-campos`).
    CONSTRAINT "enrolamientos_biometricos_cifrado_chk" CHECK ("referencia_cifrada" LIKE 'enc:v%')
);
CREATE UNIQUE INDEX "enrolamientos_biometricos_persona_id_key" ON "core"."enrolamientos_biometricos"("persona_id");
CREATE INDEX "enrolamientos_biometricos_tenant_id_idx" ON "core"."enrolamientos_biometricos"("tenant_id");
ALTER TABLE "core"."enrolamientos_biometricos" ADD CONSTRAINT "enrolamientos_biometricos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."enrolamientos_biometricos" ADD CONSTRAINT "enrolamientos_biometricos_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."enrolamientos_biometricos" ADD CONSTRAINT "enrolamientos_biometricos_consentimiento_id_fkey" FOREIGN KEY ("consentimiento_id") REFERENCES "core"."consentimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- UPDATE solo lo usa la rotación de la DEK de la empresa (recifra la referencia); DELETE es la supresión al
-- revocar el consentimiento. Sin TRUNCATE.
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."enrolamientos_biometricos" TO opai_app;
REVOKE TRUNCATE ON "core"."enrolamientos_biometricos" FROM opai_app;

ALTER TABLE "core"."enrolamientos_biometricos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."enrolamientos_biometricos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."enrolamientos_biometricos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La persona y el consentimiento deben ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "core"."enrolamientos_biometricos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'consentimiento_id', 'core.consentimientos');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "core"."enrolamientos_biometricos";
-- Solo elimina la tabla nueva de esta migración. Las referencias que contenga se pierden y habría que
-- enrolar de nuevo a las personas (y borrar sus rostros en el proveedor); ante la duda, restaura el snapshot.
