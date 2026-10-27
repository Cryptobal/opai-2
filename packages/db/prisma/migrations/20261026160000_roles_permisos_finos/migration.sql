-- Brief 07c · B2 · Roles personalizados y permisos finos (ADR-016, ADR-022).
-- Aditiva: agrega los roles del tenant, las excepciones por usuario y la referencia opcional de la
-- membresía a un rol del tenant (null = rol base). Timestamp posterior y sin dependencia del PR 1 (B1).

-- CreateTable
CREATE TABLE "core"."roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "permisos" TEXT[],
    "archivado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."permiso_excepciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "permiso" TEXT NOT NULL,
    "conceder" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permiso_excepciones_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "core"."memberships" ADD COLUMN "role_id" UUID;

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "core"."roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_nombre_key" ON "core"."roles"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "permiso_excepciones_tenant_id_idx" ON "core"."permiso_excepciones"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_excepciones_membership_id_permiso_key" ON "core"."permiso_excepciones"("membership_id", "permiso");

-- CreateIndex
CREATE INDEX "memberships_role_id_idx" ON "core"."memberships"("role_id");

-- AddForeignKey
ALTER TABLE "core"."roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."permiso_excepciones" ADD CONSTRAINT "permiso_excepciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."permiso_excepciones" ADD CONSTRAINT "permiso_excepciones_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "core"."memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "core"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- SQL manual (ADR-002, CLAUDE.md): RLS por tenant en las tablas nuevas. La identidad es global
-- (users, sin tenant) pero el rol del tenant y sus excepciones sí cuelgan del tenant.
-- Los GRANT los hereda opai_app por ALTER DEFAULT PRIVILEGES de la migración inicial.
-- ---------------------------------------------------------------------------

ALTER TABLE "core"."roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."roles" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."permiso_excepciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."permiso_excepciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger de la migración de endurecimiento del Brief 02): las
-- FK de Postgres no pasan por RLS. La membresía solo apunta a un rol de su empresa, y una excepción
-- solo a una membresía de su empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."memberships"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('role_id', 'core.roles');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."permiso_excepciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('membership_id', 'core.memberships');
