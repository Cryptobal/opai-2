-- Qué hace y por qué: CAR-167 (BRIEF-33). Seguimiento del cierre de mes por borrador: proforma enviada,
-- OK u observación del cliente y OC/HES. ADITIVA: una tabla nueva con RLS FORCE, sin tocar las existentes.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."ventas_cierre_seguimientos" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "documento_id" UUID NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "requiere_oc_hes" BOOLEAN NOT NULL DEFAULT false,
  "orden_compra" TEXT,
  "hes" TEXT,
  "observacion" TEXT,
  "enviada_en" TIMESTAMPTZ(6),
  "recordada_en" TIMESTAMPTZ(6),
  "ok_en" TIMESTAMPTZ(6),
  "observada_en" TIMESTAMPTZ(6),
  "actualizado_por_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ventas_cierre_seguimientos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ventas_cierre_seguimientos_estado_check" CHECK ("estado" IN ('pendiente', 'enviada', 'observada', 'ok'))
);

CREATE UNIQUE INDEX "ventas_cierre_seguimientos_documento_id_key"
  ON "finanzas"."ventas_cierre_seguimientos" ("documento_id");
CREATE INDEX "ventas_cierre_seguimientos_tenant_id_estado_idx"
  ON "finanzas"."ventas_cierre_seguimientos" ("tenant_id", "estado");

ALTER TABLE "finanzas"."ventas_cierre_seguimientos"
  ADD CONSTRAINT "ventas_cierre_seguimientos_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."ventas_cierre_seguimientos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."ventas_cierre_seguimientos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."ventas_cierre_seguimientos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_cierre_seguimientos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');

COMMIT;

-- Reversión: DROP TABLE "finanzas"."ventas_cierre_seguimientos"; (solo guarda seguimiento, no datos contables).
