-- Núcleo · CAR-251: grupos o equipos de usuarios para autorización (los nombrará CAR-252 como
-- aprobadores junto con usuarios o un perfil). Migración aditiva: dos tablas nuevas, sin datos.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
-- FK compuestas por tenant: un miembro solo puede ser usuario de la MISMA empresa (memberships) y
-- solo puede colgar de un grupo de la MISMA empresa, aunque alguien salte la capacidad.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."grupos_usuarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "archivado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grupos_usuarios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "grupos_usuarios_tenant_id_idx" ON "core"."grupos_usuarios"("tenant_id");
CREATE UNIQUE INDEX "grupos_usuarios_tenant_id_id_key" ON "core"."grupos_usuarios"("tenant_id", "id");
-- Nombre único por empresa entre los grupos vigentes (sin distinguir mayúsculas); archivar libera el
-- nombre. Índice parcial: no se expresa en el schema de Prisma.
CREATE UNIQUE INDEX "grupos_usuarios_tenant_nombre_vigente_key"
  ON "core"."grupos_usuarios"("tenant_id", lower("nombre")) WHERE "archivado_en" IS NULL;

CREATE TABLE "core"."grupo_usuarios_miembros" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grupo_usuarios_miembros_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grupo_usuarios_miembros_grupo_id_user_id_key"
  ON "core"."grupo_usuarios_miembros"("grupo_id", "user_id");
CREATE INDEX "grupo_usuarios_miembros_tenant_id_user_id_idx"
  ON "core"."grupo_usuarios_miembros"("tenant_id", "user_id");
-- Índice de la FK compuesta hacia el grupo (lecturas de miembros por grupo y CASCADE).
CREATE INDEX "grupo_usuarios_miembros_tenant_id_grupo_id_idx"
  ON "core"."grupo_usuarios_miembros"("tenant_id", "grupo_id");

ALTER TABLE "core"."grupos_usuarios" ADD CONSTRAINT "grupos_usuarios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."grupo_usuarios_miembros" ADD CONSTRAINT "grupo_usuarios_miembros_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."grupo_usuarios_miembros" ADD CONSTRAINT "grupo_usuarios_miembros_tenant_id_grupo_id_fkey"
  FOREIGN KEY ("tenant_id", "grupo_id") REFERENCES "core"."grupos_usuarios"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."grupo_usuarios_miembros" ADD CONSTRAINT "grupo_usuarios_miembros_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "core"."memberships"("tenant_id", "user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."grupos_usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."grupos_usuarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."grupos_usuarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."grupo_usuarios_miembros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."grupo_usuarios_miembros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."grupo_usuarios_miembros" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Archivar, nunca borrar en duro (defensa en profundidad): la app no puede DELETE sobre el grupo.
-- La membresía sí se borra al quitar a alguien (queda en core.audit_events).
REVOKE DELETE ON "core"."grupos_usuarios" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "core"."grupo_usuarios_miembros";
-- DROP TABLE IF EXISTS "core"."grupos_usuarios";
