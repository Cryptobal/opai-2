-- Banco en línea por Web4Leads (aditiva): id externo del movimiento (idempotencia dura) y última
-- sincronización de la cuenta. Sin tablas nuevas: la RLS de ambas tablas ya está en vigor.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."movimientos_bancarios" ADD COLUMN IF NOT EXISTS "id_externo" TEXT;
-- Varios NULL no chocan en un índice único: cartola y manual no llevan id externo.
CREATE UNIQUE INDEX IF NOT EXISTS "movimientos_bancarios_tenant_id_cuenta_id_id_externo_key"
  ON "finanzas"."movimientos_bancarios" ("tenant_id", "cuenta_id", "id_externo");

ALTER TABLE "finanzas"."cuentas_bancarias" ADD COLUMN IF NOT EXISTS "ultima_sync_en" TIMESTAMPTZ(6);
ALTER TABLE "finanzas"."cuentas_bancarias" ADD COLUMN IF NOT EXISTS "saldo_banco" BIGINT;
