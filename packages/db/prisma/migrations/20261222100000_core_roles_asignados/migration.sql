-- Núcleo · CAR-359: varios roles por miembro y roles asignados a grupos (referente GitHub).
-- Migración aditiva: un índice único nuevo en roles y dos tablas nuevas, sin datos. Nadie gana ni
-- pierde acceso al aplicarla: las tablas nacen vacías y el acceso actual sale igual que antes.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
-- FK compuestas por tenant: el rol, el miembro y el grupo son de la MISMA empresa.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Destino de las FK compuestas hacia el rol (el id ya es único; esto solo agrega el par).
CREATE UNIQUE INDEX "roles_tenant_id_id_key" ON "core"."roles"("tenant_id", "id");

CREATE TABLE "core"."roles_miembro" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_miembro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_miembro_tenant_id_user_id_role_id_key"
  ON "core"."roles_miembro"("tenant_id", "user_id", "role_id");
CREATE INDEX "roles_miembro_tenant_id_role_id_idx" ON "core"."roles_miembro"("tenant_id", "role_id");

CREATE TABLE "core"."roles_grupo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_grupo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_grupo_tenant_id_grupo_id_role_id_key"
  ON "core"."roles_grupo"("tenant_id", "grupo_id", "role_id");
CREATE INDEX "roles_grupo_tenant_id_role_id_idx" ON "core"."roles_grupo"("tenant_id", "role_id");

ALTER TABLE "core"."roles_miembro" ADD CONSTRAINT "roles_miembro_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."roles_miembro" ADD CONSTRAINT "roles_miembro_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "core"."memberships"("tenant_id", "user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."roles_miembro" ADD CONSTRAINT "roles_miembro_tenant_id_role_id_fkey"
  FOREIGN KEY ("tenant_id", "role_id") REFERENCES "core"."roles"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."roles_grupo" ADD CONSTRAINT "roles_grupo_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."roles_grupo" ADD CONSTRAINT "roles_grupo_tenant_id_grupo_id_fkey"
  FOREIGN KEY ("tenant_id", "grupo_id") REFERENCES "core"."grupos_usuarios"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."roles_grupo" ADD CONSTRAINT "roles_grupo_tenant_id_role_id_fkey"
  FOREIGN KEY ("tenant_id", "role_id") REFERENCES "core"."roles"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."roles_miembro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."roles_miembro" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."roles_miembro" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."roles_grupo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."roles_grupo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."roles_grupo" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "core"."roles_grupo";
-- DROP TABLE IF EXISTS "core"."roles_miembro";
-- DROP INDEX IF EXISTS "core"."roles_tenant_id_id_key";
