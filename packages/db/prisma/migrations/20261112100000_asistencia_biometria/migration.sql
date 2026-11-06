-- CAR-89 · B4 (Face ID, D-02, D-03, D-05): enrolamiento facial y consentimientos versionados de Asistencia.
-- Migración ADITIVA: dos tablas nuevas con RLS `tenant_isolation` (ENABLE + FORCE). No toca datos existentes.
-- Se guarda solo la referencia del proveedor, cifrada por la aplicación; nunca una foto (D-04).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "asistencia"."enrolamientos_faciales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referencia" TEXT,
    "consentimiento_id" UUID NOT NULL,
    "canal" TEXT NOT NULL,
    "enrolado_por" UUID,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "enrolado_en" TIMESTAMPTZ(6) NOT NULL,
    "revocado_en" TIMESTAMPTZ(6),
    "motivo_baja" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "enrolamientos_faciales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enrolamientos_faciales_estado_chk" CHECK ("estado" IN ('activo', 'revocado', 'suprimido')),
    CONSTRAINT "enrolamientos_faciales_canal_chk" CHECK ("canal" IN ('kiosco', 'erp', 'telefono_personal')),
    CONSTRAINT "enrolamientos_faciales_baja_chk" CHECK ("motivo_baja" IS NULL OR "motivo_baja" IN ('trabajador', 'rrhh', 'consentimiento', 'desvinculacion')),
    -- Activo exige referencia; dado de baja no puede conservarla (la biometría se destruye, L-14 y L-15).
    CONSTRAINT "enrolamientos_faciales_referencia_chk" CHECK (("estado" = 'activo' AND "referencia" IS NOT NULL) OR ("estado" <> 'activo' AND "referencia" IS NULL))
);
CREATE UNIQUE INDEX "enrolamientos_faciales_tenant_id_persona_id_key" ON "asistencia"."enrolamientos_faciales"("tenant_id", "persona_id");
CREATE INDEX "enrolamientos_faciales_tenant_id_estado_idx" ON "asistencia"."enrolamientos_faciales"("tenant_id", "estado");

CREATE TABLE "asistencia"."consentimientos_personas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "texto_hash" TEXT NOT NULL,
    "medio" TEXT NOT NULL,
    "aceptado_en" TIMESTAMPTZ(6) NOT NULL,
    "registrado_por" UUID,
    "revocado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "consentimientos_personas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consentimientos_personas_tipo_chk" CHECK ("tipo" IN ('biometria_facial', 'telefono_personal')),
    CONSTRAINT "consentimientos_personas_medio_chk" CHECK ("medio" IN ('kiosco', 'erp', 'portal'))
);
CREATE INDEX "consentimientos_personas_tenant_id_persona_id_tipo_idx" ON "asistencia"."consentimientos_personas"("tenant_id", "persona_id", "tipo");
-- Un solo consentimiento vigente por persona y tipo.
CREATE UNIQUE INDEX "consentimientos_personas_vigente_key" ON "asistencia"."consentimientos_personas"("tenant_id", "persona_id", "tipo") WHERE "revocado_en" IS NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['enrolamientos_faciales', 'consentimientos_personas'] LOOP
    EXECUTE format('ALTER TABLE "asistencia".%I ADD CONSTRAINT %I FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_tenant_id_fkey');
    EXECUTE format('ALTER TABLE "asistencia".%I ADD CONSTRAINT %I FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_persona_id_fkey');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON "asistencia".%I TO opai_app', t);
    EXECUTE format('ALTER TABLE "asistencia".%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE "asistencia".%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON "asistencia".%I AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
    EXECUTE format('CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "asistencia".%I FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(%L, %L)', t, 'persona_id', 'core.personas');
  END LOOP;
END
$$;

-- El consentimiento del enrolamiento debe ser de la misma empresa.
CREATE TRIGGER mismo_tenant_consentimiento BEFORE INSERT OR UPDATE ON "asistencia"."enrolamientos_faciales"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('consentimiento_id', 'asistencia.consentimientos_personas');

COMMIT;

-- Reversión: migración aditiva. Antes de usarla: DROP TABLE "asistencia"."enrolamientos_faciales", "asistencia"."consentimientos_personas";
-- Los consentimientos son evidencia legal (Ley 21.719): con filas reales se restauran desde el snapshot de Neon, no se borran.
