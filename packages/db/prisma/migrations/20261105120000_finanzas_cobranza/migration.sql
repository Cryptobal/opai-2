-- Qué hace y por qué: CAR-166 (BRIEF-29). Cobranza de ventas: historial de gestiones por documento
-- (recordatorios automáticos y manuales, notas) y pausa manual de la cobranza de un documento. El
-- índice único parcial impide enviar dos veces el mismo paso de la secuencia aunque el trabajo diario
-- se ejecute en paralelo. ADITIVA: tabla nueva y una columna con valor por defecto.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."documentos_emitidos"
  ADD COLUMN "cobranza_pausada" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "finanzas"."cobranza_gestiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "canal" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "paso" INTEGER,
    "resultado" TEXT NOT NULL,
    "detalle" TEXT,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobranza_gestiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cobranza_gestiones_canal_check" CHECK ("canal" IN ('correo', 'whatsapp_manual', 'nota')),
    CONSTRAINT "cobranza_gestiones_origen_check" CHECK ("origen" IN ('manual', 'automatico')),
    CONSTRAINT "cobranza_gestiones_resultado_check" CHECK ("resultado" IN ('enviado', 'fallido', 'omitido')),
    CONSTRAINT "cobranza_gestiones_paso_check" CHECK ("paso" IS NULL OR "paso" >= 1)
);
CREATE INDEX "cobranza_gestiones_tenant_documento_idx"
  ON "finanzas"."cobranza_gestiones"("tenant_id", "documento_id", "created_at");
CREATE INDEX "cobranza_gestiones_tenant_cuenta_idx"
  ON "finanzas"."cobranza_gestiones"("tenant_id", "cuenta_id", "created_at");
CREATE UNIQUE INDEX "cobranza_gestiones_paso_unico_idx"
  ON "finanzas"."cobranza_gestiones"("documento_id", "paso")
  WHERE "origen" = 'automatico' AND "resultado" = 'enviado' AND "paso" IS NOT NULL;
ALTER TABLE "finanzas"."cobranza_gestiones" ADD CONSTRAINT "cobranza_gestiones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cobranza_gestiones" ADD CONSTRAINT "cobranza_gestiones_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cobranza_gestiones" ADD CONSTRAINT "cobranza_gestiones_cuenta_id_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cobranza_gestiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."cobranza_gestiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."cobranza_gestiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."cobranza_gestiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'documento_id', 'finanzas.documentos_emitidos', 'cuenta_id', 'core.cuentas');

COMMIT;

-- Reversión (manual, rol propietario):
--   DROP TABLE "finanzas"."cobranza_gestiones";
--   ALTER TABLE "finanzas"."documentos_emitidos" DROP COLUMN "cobranza_pausada";
-- Se pierde el historial de gestiones y las pausas manuales; los documentos no cambian.
