-- CAR-136, Brief 20 PR 2: ajustes extendidos (metas, aviso, calendario, tolerancia) y registro de avisos
-- in-app. Aditiva y reversible (solo ADD COLUMN / CREATE TABLE). Timestamp posterior a 20261102150000.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_ajustes"
  ADD COLUMN IF NOT EXISTS "tolerancia_cierre" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS "horizonte_semanas" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "calendario_pagos" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "aviso_activo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "aviso_umbral" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "meta_celda_ms" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "meta_guardado_p95_ms" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS "meta_carga_inicial_s" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "metas_visibles" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "finanzas"."flujo_ajustes"
  ADD CONSTRAINT "flujo_ajustes_tolerancia_check" CHECK ("tolerancia_cierre" >= 0),
  ADD CONSTRAINT "flujo_ajustes_horizonte_check" CHECK ("horizonte_semanas" >= 1 AND "horizonte_semanas" <= 52);

CREATE TABLE IF NOT EXISTS "finanzas"."flujo_avisos_emitidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "semana" DATE NOT NULL,
    "saldo_proyectado" INTEGER NOT NULL,
    "emitido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flujo_avisos_emitidos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_avisos_emitidos_semana_lunes_check" CHECK (EXTRACT(ISODOW FROM "semana") = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS "flujo_avisos_emitidos_tenant_semana_key"
  ON "finanzas"."flujo_avisos_emitidos"("tenant_id", "semana");

ALTER TABLE "finanzas"."flujo_avisos_emitidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_avisos_emitidos" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "finanzas"."flujo_avisos_emitidos"
  AS PERMISSIVE FOR ALL TO opai_app
  USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "finanzas"."flujo_avisos_emitidos"
  ADD CONSTRAINT "flujo_avisos_emitidos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

-- Reversión (manual): borra avisos emitidos y columnas nuevas; pierde configuración de metas/aviso del tenant.
--   BEGIN; SET LOCAL lock_timeout = '5s';
--   DROP TABLE IF EXISTS "finanzas"."flujo_avisos_emitidos";
--   ALTER TABLE "finanzas"."flujo_ajustes" DROP CONSTRAINT IF EXISTS "flujo_ajustes_horizonte_check";
--   ALTER TABLE "finanzas"."flujo_ajustes" DROP CONSTRAINT IF EXISTS "flujo_ajustes_tolerancia_check";
--   ALTER TABLE "finanzas"."flujo_ajustes"
--     DROP COLUMN IF EXISTS "metas_visibles",
--     DROP COLUMN IF EXISTS "meta_carga_inicial_s",
--     DROP COLUMN IF EXISTS "meta_guardado_p95_ms",
--     DROP COLUMN IF EXISTS "meta_celda_ms",
--     DROP COLUMN IF EXISTS "aviso_umbral",
--     DROP COLUMN IF EXISTS "aviso_activo",
--     DROP COLUMN IF EXISTS "calendario_pagos",
--     DROP COLUMN IF EXISTS "horizonte_semanas",
--     DROP COLUMN IF EXISTS "tolerancia_cierre";
--   COMMIT;
