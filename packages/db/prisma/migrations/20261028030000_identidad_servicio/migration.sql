-- Identidad de servicio para agentes (t457u, 26-oct-2026): keys por bot con permisos finos
-- (subconjunto de los del responsable), principal "servicio" (sin dueño humano, no hereda rol) y
-- presupuesto mensual atómico por key. Aditiva e idempotente (IF NOT EXISTS / DO): no toca
-- migraciones existentes y su timestamp es posterior a todas las pendientes.

-- Permisos finos de la key: subconjunto de los efectivos del responsable (Bloque 1). `hereda_permisos`
-- true (defecto) conserva el comportamiento previo (la key hereda los permisos del rol del responsable).
ALTER TABLE "core"."api_keys" ADD COLUMN IF NOT EXISTS "permisos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "core"."api_keys" ADD COLUMN IF NOT EXISTS "hereda_permisos" BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_servicio_configurado') THEN
    ALTER TABLE "core"."api_keys" ADD CONSTRAINT "api_keys_servicio_configurado" CHECK (
      principal_tipo <> 'servicio' OR (NOT hereda_permisos AND presupuesto_mensual_micro IS NOT NULL AND presupuesto_mensual_micro > 0)
    );
  END IF;
END $$;

-- Presupuesto mensual atómico por key (Bloque 3). El chequeo y el consumo van en una transacción con
-- guarda (gastado_micro + costo <= tope_micro): dos llamadas concurrentes no superan el tope.
CREATE TABLE IF NOT EXISTS "core"."gasto_agente_mes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "periodo" DATE NOT NULL,
    "gastado_micro" BIGINT NOT NULL DEFAULT 0,
    "tope_micro" BIGINT NOT NULL,
    "aviso_80_en" TIMESTAMPTZ(6),
    "aviso_100_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gasto_agente_mes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gasto_agente_mes_tenant_id_api_key_id_periodo_key"
  ON "core"."gasto_agente_mes"("tenant_id", "api_key_id", "periodo");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gasto_agente_mes_tenant_id_fkey') THEN
    ALTER TABLE "core"."gasto_agente_mes"
      ADD CONSTRAINT "gasto_agente_mes_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gasto_agente_mes_api_key_id_fkey') THEN
    ALTER TABLE "core"."gasto_agente_mes"
      ADD CONSTRAINT "gasto_agente_mes_api_key_id_fkey"
      FOREIGN KEY ("api_key_id") REFERENCES "core"."api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- RLS por tenant (contrato multi-tenant de AGENTS.md). opai_app es NOBYPASSRLS; los GRANT los hereda
-- por ALTER DEFAULT PRIVILEGES de la migración inicial.
ALTER TABLE "core"."gasto_agente_mes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."gasto_agente_mes" FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'gasto_agente_mes' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "core"."gasto_agente_mes" AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END
$$;

-- La FK a api_keys no pasa por RLS: el trigger exige que la key sea del mismo tenant que el gasto.
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."gasto_agente_mes";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."gasto_agente_mes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('api_key_id', 'core.api_keys');
