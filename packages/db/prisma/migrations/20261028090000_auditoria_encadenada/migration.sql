-- Auditoría atómica y encadenada (núcleo P0, auditoría del 26-oct-2026 pedida por Carlos, t457u).
-- 1) `agregarAAuditoria` ahora inserta en `core.audit_events` en la MISMA transacción que la
--    escritura de negocio (packages/capabilities/src/execute.ts); antes el insert ocurría después,
--    fuera de la transacción.
-- 2) Encadena los eventos por tenant igual que `core.bitacora` (ADR-023), con el mismo algoritmo
--    de `@opai/domain` (sha256(hashAnterior + "\n" + hashCanon)). `hashCanon` congela la forma
--    canónica (tenant, seq, actor, capability, entidad, createdAt y un **digest** SHA-256 del
--    payload, no el payload crudo) para que una futura anonimización del payload (Ley 21.719) no
--    exponga el contenido en `hash_canon`. La verificación recalcula también el digest del payload.
-- 3) `pgcrypto` solo lo usa este backfill (`digest()/encode()` en SQL); el código de la app sigue
--    hasheando en Node (Web Crypto, `@opai/domain`).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE IF NOT EXISTS "core"."auditoria_cabezas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ultimo_seq" INTEGER,
    "verificada_en" TIMESTAMPTZ(6),
    "verificacion_ok" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auditoria_cabezas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auditoria_cabezas_tenant_id_fkey" FOREIGN KEY ("tenant_id")
      REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "auditoria_cabezas_tenant_id_key" ON "core"."auditoria_cabezas"("tenant_id");

-- RLS: aislamiento por tenant (plantilla de REGLAS-codigo.md). CI falla si falta (rls-nucleo*.test).
ALTER TABLE "core"."auditoria_cabezas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."auditoria_cabezas" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."auditoria_cabezas" TO opai_app;
DROP POLICY IF EXISTS tenant_isolation ON "core"."auditoria_cabezas";
CREATE POLICY tenant_isolation ON "core"."auditoria_cabezas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- AlterTable: columnas de la cadena en `audit_events` (nulas por ahora; el backfill las completa).
ALTER TABLE "core"."audit_events"
  ADD COLUMN IF NOT EXISTS "seq" INTEGER,
  ADD COLUMN IF NOT EXISTS "hash_anterior" TEXT,
  ADD COLUMN IF NOT EXISTS "hash" TEXT,
  ADD COLUMN IF NOT EXISTS "hash_canon" TEXT;

-- Backfill determinista: una fila a la vez, por tenant y por (created_at, id), igual orden que
-- `verificarAuditoria` espera recorrer. Usa un separador y `digest()` de pgcrypto; el formato del
-- texto histórico se recalcula desde las columnas con `canonHistorico` (ADR-051).
-- Variables con prefijo `v_` a propósito: sin prefijo, Postgres las confunde con las columnas
-- homónimas de `audit_events` dentro del UPDATE ("column reference ... is ambiguous", 42702).
LOCK TABLE core.audit_events IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE
  r RECORD;
  v_cur_tenant UUID;
  v_seq INTEGER := 0;
  v_hash_anterior TEXT := repeat('0', 64);
  v_hash_nuevo TEXT;
  v_canon TEXT;
  v_payload_digest TEXT;
  v_crypto_schema TEXT;
BEGIN
  SELECT n.nspname INTO STRICT v_crypto_schema FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pgcrypto';
  FOR r IN
    SELECT id, tenant_id, actor_type, actor_id, via_user_id, capability, entity_type, entity_id,
           payload, created_at
    FROM "core"."audit_events"
    WHERE seq IS NULL
    ORDER BY tenant_id, created_at, id
  LOOP
    IF v_cur_tenant IS NULL OR v_cur_tenant <> r.tenant_id THEN
      v_cur_tenant := r.tenant_id;
      SELECT seq, hash INTO v_seq, v_hash_anterior FROM core.audit_events
        WHERE tenant_id = r.tenant_id AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1;
      v_seq := coalesce(v_seq, 0);
      v_hash_anterior := coalesce(v_hash_anterior, repeat('0', 64));
    END IF;
    v_seq := v_seq + 1;
    EXECUTE format('SELECT encode(%I.digest($1, ''sha256''), ''hex'')', v_crypto_schema)
      INTO v_payload_digest USING coalesce(r.payload::text, 'null');
    v_canon := jsonb_build_array(r.tenant_id::text, v_seq, r.actor_type,
      r.actor_id, r.via_user_id, r.capability, r.entity_type, r.entity_id,
      to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      v_payload_digest)::text;
    EXECUTE format('SELECT encode(%I.digest($1, ''sha256''), ''hex'')', v_crypto_schema)
      INTO v_hash_nuevo USING v_hash_anterior || E'\n' || v_canon;
    UPDATE "core"."audit_events"
      SET "seq" = v_seq, "hash_anterior" = v_hash_anterior, "hash" = v_hash_nuevo, "hash_canon" = v_canon
      WHERE id = r.id;
    v_hash_anterior := v_hash_nuevo;
  END LOOP;
END $$;

-- Fase 1: NULLABLE mientras conviven versiones. Fase 2 (tras desplegar): otra migración.

CREATE UNIQUE INDEX IF NOT EXISTS "audit_events_tenant_id_seq_key" ON "core"."audit_events"("tenant_id", "seq");

-- Inmutable para la app (idempotente: el PR #48/#56 ya lo revocó; se repite "por si acaso", sin
-- TRUNCATE porque `opai_app` nunca lo tuvo concedido). El dueño de la migración conserva el acceso
-- para el backfill de arriba y para la prueba de alteración de `verificarAuditoria`.
REVOKE UPDATE, DELETE ON "core"."audit_events" FROM opai_app;
COMMIT;
