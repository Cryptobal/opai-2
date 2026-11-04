-- Qué hace y por qué: CAR-155 (BRIEF-28). Registro de cada envío de un documento emitido al cliente
-- (PDF y XML por Comunicaciones): a quién, con qué adjuntos, quién lo mandó y si salió o falló. Es lo
-- que muestra el historial de la ficha y lo que impide reenviar sin saberlo. ADITIVA: tabla nueva.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."documentos_emitidos_envios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "destinatarios" TEXT[] NOT NULL,
    "adjuntos" TEXT[] NOT NULL,
    "estado" TEXT NOT NULL,
    "error" TEXT,
    "enviado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_emitidos_envios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documentos_emitidos_envios_estado_check" CHECK ("estado" IN ('enviado', 'fallido'))
);
CREATE INDEX "documentos_emitidos_envios_tenant_documento_idx"
  ON "finanzas"."documentos_emitidos_envios"("tenant_id", "documento_id", "created_at");
ALTER TABLE "finanzas"."documentos_emitidos_envios" ADD CONSTRAINT "documentos_emitidos_envios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos_envios" ADD CONSTRAINT "documentos_emitidos_envios_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos_envios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."documentos_emitidos_envios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."documentos_emitidos_envios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."documentos_emitidos_envios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');

COMMIT;

-- Reversión (manual, rol propietario): DROP TABLE "finanzas"."documentos_emitidos_envios";
-- La tabla es nueva y nada más depende de ella: solo se pierde el historial de envíos registrado.
