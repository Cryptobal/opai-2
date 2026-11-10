-- CAR-138 (PR 7) · Referencias de clientes con consentimiento (opt-in). ADITIVA: tabla nueva y vacía;
-- no toca tablas existentes ni migra datos. Append-only: cada fila es un otorgamiento o una revocación y
-- el estado vigente es la última fila de la cuenta; sin fila vigente la cuenta no aparece como referencia.
-- RLS ENABLE + FORCE con la política `tenant_isolation`, disparador de misma empresa y sin UPDATE/DELETE
-- para `opai_app` (corregir es una fila nueva).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."cuentas_referencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "estado" TEXT NOT NULL,
    "mostrar_nombre" BOOLEAN NOT NULL DEFAULT false,
    "descripcion" TEXT,
    "cita" TEXT,
    "otorgado_en" DATE,
    "vigente_hasta" DATE,
    "contacto_id" UUID,
    "evidencia" TEXT,
    "evidencia_detalle" TEXT,
    "motivo" TEXT,
    "registrado_por_id" UUID NOT NULL,
    -- Orden de escritura real (no el inicio de la transacción): la última fila de la cuenta es la de mayor seq.
    "seq" BIGINT GENERATED ALWAYS AS IDENTITY,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_referencias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cuentas_referencias_estado_check" CHECK ("estado" IN ('otorgado', 'revocado')),
    CONSTRAINT "cuentas_referencias_evidencia_check" CHECK (
      "evidencia" IS NULL OR "evidencia" IN ('correo', 'documento_firmado', 'contrato', 'acta', 'otro')),
    -- Otorgar exige fecha y evidencia con detalle; revocar exige motivo y no muestra nada.
    CONSTRAINT "cuentas_referencias_otorgado_check" CHECK (
      "estado" <> 'otorgado' OR ("otorgado_en" IS NOT NULL AND "evidencia" IS NOT NULL
        AND "evidencia_detalle" IS NOT NULL AND char_length(btrim("evidencia_detalle")) BETWEEN 3 AND 300)),
    CONSTRAINT "cuentas_referencias_revocado_check" CHECK (
      "estado" <> 'revocado' OR ("motivo" IS NOT NULL AND char_length(btrim("motivo")) BETWEEN 3 AND 300
        AND "mostrar_nombre" = false AND "descripcion" IS NULL AND "cita" IS NULL)),
    CONSTRAINT "cuentas_referencias_vigencia_check" CHECK (
      "vigente_hasta" IS NULL OR ("otorgado_en" IS NOT NULL AND "vigente_hasta" >= "otorgado_en")),
    CONSTRAINT "cuentas_referencias_textos_check" CHECK (
      ("descripcion" IS NULL OR char_length("descripcion") <= 400)
      AND ("cita" IS NULL OR char_length("cita") <= 400))
);
CREATE INDEX "cuentas_referencias_tenant_id_cuenta_id_seq_idx"
  ON "core"."cuentas_referencias"("tenant_id", "cuenta_id", "seq");

ALTER TABLE "core"."cuentas_referencias" ADD CONSTRAINT "cuentas_referencias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."cuentas_referencias" ADD CONSTRAINT "cuentas_referencias_cuenta_id_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."cuentas_referencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."cuentas_referencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."cuentas_referencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."cuentas_referencias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas', 'contacto_id', 'core.contactos');

-- Append-only de verdad: el grant inicial dio UPDATE/DELETE a opai_app sobre todo `core`.
REVOKE UPDATE, DELETE ON "core"."cuentas_referencias" FROM opai_app;

COMMIT;

-- Reversión (manual, rol propietario): DROP TABLE "core"."cuentas_referencias";
-- La tabla es nueva y nada depende de ella: solo se pierde el registro de consentimientos de referencia.
