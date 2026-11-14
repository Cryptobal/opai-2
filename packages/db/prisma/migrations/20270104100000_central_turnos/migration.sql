-- Central · CAR-470 (Brief 15b · PR 4): humano a cargo (R12, R13, R15). Migración aditiva, sin datos:
-- turnos de central, pausas del agente y columnas de «tomada» en alertas.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation; referencias del mismo tenant.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "central"."alertas"
  ADD COLUMN "tomada_por_id" UUID,
  ADD COLUMN "tomada_en" TIMESTAMPTZ(6),
  ADD CONSTRAINT "alertas_tomada_check" CHECK (("tomada_por_id" IS NULL) = ("tomada_en" IS NULL));
ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_tomada_por_id_fkey"
  FOREIGN KEY ("tomada_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "central"."turnos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "operador_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "entrega_a_id" UUID,
    "nota_entrega" TEXT,
    "cerrado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "turnos_estado_check" CHECK ("estado" IN ('abierto', 'en_entrega', 'cerrado')),
    CONSTRAINT "turnos_entrega_check" CHECK (("estado" = 'en_entrega') = ("entrega_a_id" IS NOT NULL)),
    CONSTRAINT "turnos_cierre_check" CHECK (("estado" = 'cerrado') = ("cerrado_en" IS NOT NULL))
);

CREATE TABLE "central"."pausas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "pausada_por_id" UUID,
    "motivo" TEXT,
    "reanudada_por_id" UUID,
    "reanudada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pausas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pausas_reanudada_check" CHECK (("reanudada_en" IS NULL) = ("reanudada_por_id" IS NULL))
);

-- Un solo turno vivo por empresa y una sola pausa vigente por instalación (null = toda la empresa).
CREATE UNIQUE INDEX "turnos_un_vivo_por_tenant" ON "central"."turnos"("tenant_id") WHERE "estado" <> 'cerrado';
CREATE UNIQUE INDEX "pausas_una_vigente" ON "central"."pausas"("tenant_id", "instalacion_id") NULLS NOT DISTINCT
  WHERE "reanudada_en" IS NULL;
CREATE INDEX "turnos_tenant_id_estado_idx" ON "central"."turnos"("tenant_id", "estado");
CREATE INDEX "pausas_tenant_id_idx" ON "central"."pausas"("tenant_id");

ALTER TABLE "central"."turnos" ADD CONSTRAINT "turnos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."turnos" ADD CONSTRAINT "turnos_operador_id_fkey"
  FOREIGN KEY ("operador_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."turnos" ADD CONSTRAINT "turnos_entrega_a_id_fkey"
  FOREIGN KEY ("entrega_a_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."pausas" ADD CONSTRAINT "pausas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."pausas" ADD CONSTRAINT "pausas_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "central"."pausas" ADD CONSTRAINT "pausas_pausada_por_id_fkey"
  FOREIGN KEY ("pausada_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."pausas" ADD CONSTRAINT "pausas_reanudada_por_id_fkey"
  FOREIGN KEY ("reanudada_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."pausas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

ALTER TABLE "central"."turnos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."turnos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."turnos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "central"."pausas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."pausas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."pausas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "central"."turnos", "central"."pausas" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."pausas"; DROP TABLE IF EXISTS "central"."turnos";
-- ALTER TABLE "central"."alertas" DROP COLUMN "tomada_por_id", DROP COLUMN "tomada_en";
