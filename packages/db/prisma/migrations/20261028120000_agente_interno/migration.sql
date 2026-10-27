-- NÚCLEO-E2: el agente interno actúa vía usuario, sin API key sintética.
-- Aditiva, idempotente; no cambia roles ni políticas de aislamiento existentes.
ALTER TABLE core.aprobaciones ALTER COLUMN api_key_id DROP NOT NULL;
ALTER TABLE core.aprobaciones ADD COLUMN IF NOT EXISTS agente_interno_id TEXT;
ALTER TABLE core.gasto_agente_mes ALTER COLUMN api_key_id DROP NOT NULL;
ALTER TABLE core.gasto_agente_mes ADD COLUMN IF NOT EXISTS agente_interno_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS gasto_agente_mes_tenant_id_agente_interno_id_periodo_key
  ON core.gasto_agente_mes (tenant_id, agente_interno_id, periodo);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aprobaciones_identidad_agente') THEN
    ALTER TABLE core.aprobaciones ADD CONSTRAINT aprobaciones_identidad_agente
      CHECK ((api_key_id IS NOT NULL) <> (agente_interno_id IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gasto_identidad_agente') THEN
    ALTER TABLE core.gasto_agente_mes ADD CONSTRAINT gasto_identidad_agente
      CHECK ((api_key_id IS NOT NULL) <> (agente_interno_id IS NOT NULL));
  END IF;
END $$;
