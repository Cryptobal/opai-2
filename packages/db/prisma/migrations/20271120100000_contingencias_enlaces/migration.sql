-- CAR-591: enlaces de contingencia para respuesta del trabajador por correo (token hash + vencimiento).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "asistencia"."contingencias_enlaces" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contingencia_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contingencias_enlaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contingencias_enlaces_token_hash_key" ON "asistencia"."contingencias_enlaces"("token_hash");
CREATE INDEX "contingencias_enlaces_tenant_id_contingencia_id_idx"
    ON "asistencia"."contingencias_enlaces"("tenant_id", "contingencia_id");

ALTER TABLE "asistencia"."contingencias_enlaces" ADD CONSTRAINT "contingencias_enlaces_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asistencia"."contingencias_enlaces" ADD CONSTRAINT "contingencias_enlaces_contingencia_id_fkey"
    FOREIGN KEY ("contingencia_id") REFERENCES "asistencia"."contingencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "asistencia"."contingencias_enlaces" TO opai_app;

ALTER TABLE "asistencia"."contingencias_enlaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asistencia"."contingencias_enlaces" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "asistencia"."contingencias_enlaces" AS PERMISSIVE FOR ALL TO opai_app
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."contingencias_enlaces"
    FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('contingencia_id', 'asistencia.contingencias');

COMMIT;

-- Reversión: DROP TABLE "asistencia"."contingencias_enlaces"; o restaurar desde snapshot Neon previo a la migración.