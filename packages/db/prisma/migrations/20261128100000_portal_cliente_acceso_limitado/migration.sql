-- Qué hace y por qué (CAR-300, decisión de Carlos del 11-nov-2026: las cotizaciones se ven siempre dentro
-- del Portal Cliente; base: briefs/PROPUESTA-car-218-prospecto-limitado.md §3.1). Aditiva:
--   1. portal_cliente.accesos.alcance ('completo' por defecto | 'limitado'). Los accesos existentes quedan
--      en 'completo': sin cambio de comportamiento.
--   2. portal_cliente.acceso_propuestas: historial de propuestas visibles para un acceso limitado, con RLS
--      tenant_isolation (ENABLE + FORCE) y el trigger mismo_tenant. Sin migración de datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "portal_cliente"."accesos" ADD COLUMN "alcance" TEXT NOT NULL DEFAULT 'completo';
ALTER TABLE "portal_cliente"."accesos" ADD CONSTRAINT "accesos_alcance_check" CHECK ("alcance" IN ('completo', 'limitado'));

CREATE TABLE "portal_cliente"."acceso_propuestas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "acceso_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "enviada_en" TIMESTAMPTZ(6) NOT NULL,
    "vigente_hasta" TIMESTAMPTZ(6),
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acceso_propuestas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "acceso_propuestas_estado_check" CHECK ("estado" IN ('vigente', 'reemplazada', 'archivada'))
);

CREATE INDEX "acceso_propuestas_tenant_id_acceso_id_estado_idx" ON "portal_cliente"."acceso_propuestas"("tenant_id", "acceso_id", "estado");
CREATE INDEX "acceso_propuestas_tenant_id_cotizacion_id_idx" ON "portal_cliente"."acceso_propuestas"("tenant_id", "cotizacion_id");
-- Una sola propuesta vigente por acceso.
CREATE UNIQUE INDEX "acceso_propuestas_una_vigente" ON "portal_cliente"."acceso_propuestas"("acceso_id") WHERE "estado" = 'vigente';

ALTER TABLE "portal_cliente"."acceso_propuestas" ADD CONSTRAINT "acceso_propuestas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."acceso_propuestas" ADD CONSTRAINT "acceso_propuestas_acceso_id_fkey" FOREIGN KEY ("acceso_id") REFERENCES "portal_cliente"."accesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."acceso_propuestas" ADD CONSTRAINT "acceso_propuestas_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_cliente"."acceso_propuestas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_cliente"."acceso_propuestas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "portal_cliente"."acceso_propuestas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "portal_cliente"."acceso_propuestas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('acceso_id', 'portal_cliente.accesos', 'cotizacion_id', 'cpq.cotizaciones');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción; sin datos de negocio que conservar
-- mientras no se use): BEGIN; SET LOCAL lock_timeout = '5s';
--   DROP TABLE "portal_cliente"."acceso_propuestas";
--   ALTER TABLE "portal_cliente"."accesos" DROP COLUMN "alcance"; COMMIT;
