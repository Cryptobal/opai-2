-- Brief 07c · B3 · Alcance del supervisor por instalación (ADR-022, ADR-033).
-- Aditiva: agrega la asignación supervisor ↔ instalación en `core`. El supervisor se vincula por su
-- membresía (su usuario, §16.4). Timestamp posterior al 07d (20261027000000) y previo a CRM/Puestos;
-- sin dependencia de otras migraciones salvo las tablas base (memberships, instalaciones).

-- CreateTable
CREATE TABLE "core"."supervisor_instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supervisor_instalaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supervisor_instalaciones_tenant_id_idx" ON "core"."supervisor_instalaciones"("tenant_id");

-- CreateIndex
CREATE INDEX "supervisor_instalaciones_instalacion_id_idx" ON "core"."supervisor_instalaciones"("instalacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_instalaciones_membership_id_instalacion_id_key" ON "core"."supervisor_instalaciones"("membership_id", "instalacion_id");

-- AddForeignKey
ALTER TABLE "core"."supervisor_instalaciones" ADD CONSTRAINT "supervisor_instalaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supervisor_instalaciones" ADD CONSTRAINT "supervisor_instalaciones_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "core"."memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supervisor_instalaciones" ADD CONSTRAINT "supervisor_instalaciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- SQL manual (ADR-002, CLAUDE.md): RLS por tenant en la tabla nueva. Los GRANT los hereda opai_app
-- por ALTER DEFAULT PRIVILEGES de la migración inicial.
-- ---------------------------------------------------------------------------

ALTER TABLE "core"."supervisor_instalaciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."supervisor_instalaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del Brief 02): las FK de Postgres no pasan por RLS.
-- Una asignación solo apunta a una membresía y a una instalación de su propia empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."supervisor_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('membership_id', 'core.memberships');
CREATE TRIGGER mismo_tenant_instalacion BEFORE INSERT OR UPDATE ON "core"."supervisor_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
