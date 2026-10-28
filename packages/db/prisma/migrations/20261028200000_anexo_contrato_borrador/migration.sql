-- Brief 07b · PR 4 (bloque 9): anexo de contrato en borrador (R11-R15, ADR-036 punto 5,
-- ADR-048 puntos 5 y 7). Tabla nueva, aditiva: no toca ninguna tabla existente. Funciona aunque el
-- tenant no tenga Nómina (ADR-048 punto 5); el documento aprobado se materializa en
-- `core.documentos` (ADR-039), referenciado aquí por `documento_id`.
SET lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS "core"."anexos_contrato" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "vinculo_id" UUID NOT NULL,
    "motivo_cambio" TEXT NOT NULL,
    "snapshot_antes" JSONB,
    "snapshot_despues" JSONB NOT NULL,
    "generado_por_tipo" TEXT NOT NULL,
    "generado_por_id" TEXT,
    "origen_evento_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "aprobado_por_id" TEXT,
    "aprobado_en" TIMESTAMPTZ(6),
    "rechazado_por_id" TEXT,
    "rechazado_en" TIMESTAMPTZ(6),
    "motivo_rechazo" TEXT,
    "documento_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anexos_contrato_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "anexos_contrato_motivo_cambio_check"
      CHECK ("motivo_cambio" IN ('capa', 'monto', 'instalacion', 'rol')),
    CONSTRAINT "anexos_contrato_generado_por_tipo_check"
      CHECK ("generado_por_tipo" IN ('evento', 'usuario', 'agente')),
    CONSTRAINT "anexos_contrato_estado_check"
      CHECK ("estado" IN ('borrador', 'aprobado', 'rechazado')),
    -- Consistencia del estado (R13-R15): un borrador no trae resolución; un aprobado trae quién,
    -- cuándo y su documento final; un rechazado trae quién, cuándo y el motivo obligatorio (D14).
    -- Nunca aprobado y rechazado a la vez.
    CONSTRAINT "anexos_contrato_resolucion_check" CHECK (
      ("estado" = 'borrador' AND "aprobado_por_id" IS NULL AND "aprobado_en" IS NULL
        AND "rechazado_por_id" IS NULL AND "rechazado_en" IS NULL AND "motivo_rechazo" IS NULL
        AND "documento_id" IS NULL)
      OR ("estado" = 'aprobado' AND "aprobado_por_id" IS NOT NULL AND "aprobado_en" IS NOT NULL
        AND "documento_id" IS NOT NULL AND "rechazado_por_id" IS NULL AND "rechazado_en" IS NULL)
      OR ("estado" = 'rechazado' AND "rechazado_por_id" IS NOT NULL AND "rechazado_en" IS NOT NULL
        AND "motivo_rechazo" IS NOT NULL AND "aprobado_por_id" IS NULL AND "aprobado_en" IS NULL
        AND "documento_id" IS NULL)
    )
);

-- Un mismo evento de outbox no crea dos borradores para la misma persona (idempotencia del
-- consumidor, ADR-029); varias filas con `origen_evento_id` NULL (altas manuales) no colisionan
-- entre sí (NULL se trata como distinto en un índice único de Postgres).
CREATE UNIQUE INDEX IF NOT EXISTS "anexos_contrato_tenant_id_origen_evento_id_persona_id_key"
  ON "core"."anexos_contrato"("tenant_id", "origen_evento_id", "persona_id");
CREATE INDEX IF NOT EXISTS "anexos_contrato_tenant_id_persona_id_estado_idx"
  ON "core"."anexos_contrato"("tenant_id", "persona_id", "estado");
CREATE INDEX IF NOT EXISTS "anexos_contrato_tenant_id_estado_created_at_idx"
  ON "core"."anexos_contrato"("tenant_id", "estado", "created_at");

DO $$ BEGIN
  ALTER TABLE "core"."anexos_contrato" ADD CONSTRAINT "anexos_contrato_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ALTER TABLE "core"."anexos_contrato" ADD CONSTRAINT "anexos_contrato_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ALTER TABLE "core"."anexos_contrato" ADD CONSTRAINT "anexos_contrato_vinculo_id_fkey"
    FOREIGN KEY ("vinculo_id") REFERENCES "core"."vinculos_laborales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ALTER TABLE "core"."anexos_contrato" ADD CONSTRAINT "anexos_contrato_documento_id_fkey"
    FOREIGN KEY ("documento_id") REFERENCES "core"."documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: aislamiento por tenant (plantilla de REGLAS-codigo.md). CI falla si falta (rls-nucleo*.test).
ALTER TABLE "core"."anexos_contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."anexos_contrato" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."anexos_contrato";
CREATE POLICY tenant_isolation ON "core"."anexos_contrato" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La persona, el vínculo y el documento referenciados deben ser del mismo tenant.
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."anexos_contrato";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."anexos_contrato"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'vinculo_id', 'core.vinculos_laborales',
    'documento_id', 'core.documentos');

-- Reversión (manual; Prisma no aplica down; solo si no hay borradores ni anexos aprobados que
-- conservar):
--   DROP TABLE "core"."anexos_contrato";
