-- CAR-221 · A3b: destinatarios del correo de un DTE de venta, por documento (PARA / CC / BCC).
-- Aditiva: tabla nueva, sin tocar tablas existentes. Un documento tiene exactamente un destinatario PARA
-- (el correo admite un solo destinatario principal) y hasta 19 en copia (CC) o copia oculta (BCC).
-- El origen deja trazado de dónde salió cada casilla: casilla DTE de la cuenta, contacto con rol facturación o manual.
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."documentos_emitidos_destinatarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documentos_emitidos_destinatarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documentos_emitidos_destinatarios_tipo_chk" CHECK ("tipo" IN ('PARA', 'CC', 'BCC')),
    CONSTRAINT "documentos_emitidos_destinatarios_origen_chk" CHECK ("origen" IN ('casilla_dte', 'contacto_facturacion', 'manual')),
    CONSTRAINT "documentos_emitidos_destinatarios_email_chk" CHECK ("email" = lower("email") AND length("email") BETWEEN 3 AND 254),
    CONSTRAINT "documentos_emitidos_destinatarios_orden_chk" CHECK ("orden" >= 0)
);

CREATE INDEX "documentos_emitidos_destinatarios_tenant_id_documento_id_idx" ON "finanzas"."documentos_emitidos_destinatarios"("tenant_id", "documento_id");
CREATE UNIQUE INDEX "documentos_emitidos_destinatarios_documento_id_email_key" ON "finanzas"."documentos_emitidos_destinatarios"("documento_id", "email");
CREATE UNIQUE INDEX "documentos_emitidos_destinatarios_un_para_key" ON "finanzas"."documentos_emitidos_destinatarios"("documento_id") WHERE "tipo" = 'PARA';

ALTER TABLE "finanzas"."documentos_emitidos_destinatarios" ADD CONSTRAINT "documentos_emitidos_destinatarios_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos_destinatarios" ADD CONSTRAINT "documentos_emitidos_destinatarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."documentos_emitidos_destinatarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."documentos_emitidos_destinatarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."documentos_emitidos_destinatarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "finanzas"."documentos_emitidos_destinatarios";
-- (tabla nueva sin dependientes: solo se pierden los destinatarios guardados con este cambio; los envíos
-- siguen funcionando con los contactos de facturación como antes. Además existe el snapshot previo de Neon).
