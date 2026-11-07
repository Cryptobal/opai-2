-- CAR-212 · Esquemas de cobertura por tenant para cotizar por patrón completo (aditivo, reversible:
-- DROP TABLE "cpq"."esquemas_cobertura_tramos"; DROP TABLE "cpq"."esquemas_cobertura"). Sin filas no cambia nada.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "cpq"."esquemas_cobertura" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "esquemas_cobertura_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "esquemas_cobertura_tenant_id_nombre_key" ON "cpq"."esquemas_cobertura"("tenant_id", "nombre");
CREATE INDEX "esquemas_cobertura_tenant_id_activo_idx" ON "cpq"."esquemas_cobertura"("tenant_id", "activo");

CREATE TABLE "cpq"."esquemas_cobertura_tramos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "esquema_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "patron_id" UUID NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "dias_semana" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "posiciones" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "esquemas_cobertura_tramos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "esquemas_cobertura_tramos_posiciones_check" CHECK ("posiciones" >= 1 AND "posiciones" <= 1000)
);
CREATE INDEX "esquemas_cobertura_tramos_tenant_id_esquema_id_idx" ON "cpq"."esquemas_cobertura_tramos"("tenant_id", "esquema_id");

ALTER TABLE "cpq"."esquemas_cobertura" ADD CONSTRAINT "esquemas_cobertura_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."esquemas_cobertura_tramos" ADD CONSTRAINT "esquemas_cobertura_tramos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."esquemas_cobertura_tramos" ADD CONSTRAINT "esquemas_cobertura_tramos_esquema_id_fkey"
  FOREIGN KEY ("esquema_id") REFERENCES "cpq"."esquemas_cobertura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."esquemas_cobertura_tramos" ADD CONSTRAINT "esquemas_cobertura_tramos_patron_id_fkey"
  FOREIGN KEY ("patron_id") REFERENCES "core"."patrones_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."esquemas_cobertura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."esquemas_cobertura" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."esquemas_cobertura" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."esquemas_cobertura_tramos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."esquemas_cobertura_tramos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."esquemas_cobertura_tramos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant_tramo_esquema BEFORE INSERT OR UPDATE ON "cpq"."esquemas_cobertura_tramos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('esquema_id', 'cpq.esquemas_cobertura');
CREATE TRIGGER mismo_tenant_tramo_patron BEFORE INSERT OR UPDATE ON "cpq"."esquemas_cobertura_tramos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('patron_id', 'core.patrones_turno');

COMMIT;

-- Reversión: DROP TABLE "cpq"."esquemas_cobertura_tramos"; DROP TABLE "cpq"."esquemas_cobertura"; (solo guardan plantillas de cobertura; las cotizaciones ya creadas no dependen de ellas).
