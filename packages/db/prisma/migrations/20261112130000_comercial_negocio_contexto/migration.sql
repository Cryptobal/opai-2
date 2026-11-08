-- CAR-138 (PR 4) · Contexto comercial de un negocio: notas con fuente y fecha, separando lo «confirmado»
-- por una persona de lo «inferido» (p. ej. por una IA). ADITIVA: tabla nueva y vacía; no toca tablas
-- existentes. Con RLS ENABLE + FORCE y la política `tenant_isolation`. No migra datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "comercial"."negocio_contexto" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'nota',
    "resumen" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "fecha_fuente" DATE NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'inferido',
    "creado_por_tipo" TEXT NOT NULL,
    "creado_por_id" UUID,
    "confirmado_por_id" UUID,
    "confirmado_en" TIMESTAMPTZ(6),
    "archivado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "negocio_contexto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "negocio_contexto_tipo_check" CHECK ("tipo" IN ('reunion', 'llamada', 'correo', 'visita', 'documento', 'nota')),
    CONSTRAINT "negocio_contexto_estado_check" CHECK ("estado" IN ('confirmado', 'inferido')),
    CONSTRAINT "negocio_contexto_creado_por_check" CHECK ("creado_por_tipo" IN ('user', 'agent', 'system')),
    CONSTRAINT "negocio_contexto_confirmacion_check" CHECK (
      ("estado" = 'confirmado' AND "confirmado_en" IS NOT NULL) OR ("estado" = 'inferido' AND "confirmado_en" IS NULL)
    )
);
CREATE INDEX "negocio_contexto_tenant_id_negocio_id_fecha_fuente_idx" ON "comercial"."negocio_contexto"("tenant_id", "negocio_id", "fecha_fuente");

ALTER TABLE "comercial"."negocio_contexto" ADD CONSTRAINT "negocio_contexto_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comercial"."negocio_contexto" ADD CONSTRAINT "negocio_contexto_negocio_id_fkey"
  FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comercial"."negocio_contexto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."negocio_contexto" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comercial"."negocio_contexto" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: DROP TABLE "comercial"."negocio_contexto"; (solo guarda notas de contexto del negocio; ninguna otra tabla depende de ella).
