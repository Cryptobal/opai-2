-- Brief 07d · Ley 21.719 por diseño (PR 1, bloque 1): DPA (aceptaciones append-only) y DPO.
-- Migración aditiva. Timestamp posterior a las migraciones en curso de otros PR (07c) para no
-- depender de ellas. Toda tabla nueva con tenant_id repite ENABLE RLS + política tenant_isolation
-- (REGLAS-codigo.md).

-- CreateTable
CREATE TABLE "core"."dpa_aceptaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "aceptado_por_id" UUID,
    "aceptado_por" TEXT,
    "documento_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dpa_aceptaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dpa_aceptaciones_tenant_id_created_at_idx" ON "core"."dpa_aceptaciones"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "core"."dpa_aceptaciones" ADD CONSTRAINT "dpa_aceptaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: contacto del DPO del tenant, en el perfil de empresa (1:1 con el tenant).
ALTER TABLE "core"."perfil_empresa" ADD COLUMN     "dpo_correo" TEXT;
ALTER TABLE "core"."perfil_empresa" ADD COLUMN     "dpo_nombre" TEXT;
ALTER TABLE "core"."perfil_empresa" ADD COLUMN     "dpo_telefono" TEXT;

-- RLS: aislamiento por tenant (plantilla de REGLAS-codigo.md). CI falla si falta (rls-nucleo*.test).
ALTER TABLE "core"."dpa_aceptaciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."dpa_aceptaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Append-only de verdad (Brief 07d §6). El grant inicial (20261023031142_init l.59 y l.61) dio
-- UPDATE/DELETE a opai_app sobre todo `core`, así que estas tablas no eran inmutables a nivel de
-- base: la inmutabilidad era solo convención de la aplicación. Se revoca UPDATE/DELETE a opai_app
-- sobre las aceptaciones del DPA y sobre la auditoría. El rol propietario conserva sus privilegios
-- (migraciones, seeds, scripts). Corregir es una fila nueva (INSERT), nunca UPDATE ni DELETE.
REVOKE UPDATE, DELETE ON "core"."dpa_aceptaciones" FROM opai_app;
REVOKE UPDATE, DELETE ON "core"."audit_events" FROM opai_app;
