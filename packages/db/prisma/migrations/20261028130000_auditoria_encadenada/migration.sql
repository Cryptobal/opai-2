-- Auditoría atómica y encadenada (núcleo P0, auditoría del 26-oct-2026 pedida por Carlos, t457u).
-- 1) `agregarAAuditoria` ahora inserta en `core.audit_events` en la MISMA transacción que la
--    escritura de negocio (packages/capabilities/src/execute.ts); antes el insert ocurría después,
--    fuera de la transacción.
-- 2) Encadena los eventos por tenant igual que `core.bitacora` (ADR-023), con el mismo algoritmo
--    de `@opai/domain` (sha256(hashAnterior + "\n" + hashCanon)). `hashCanon` congela la forma
--    canónica (tenant, seq, actor, capability, entidad, createdAt y un **digest** SHA-256 del
--    payload, no el payload crudo) para que una futura anonimización del payload (Ley 21.719) no
--    exponga el contenido en `hash_canon`. La verificación recalcula también el digest del payload.
-- 3) El backfill usa sha256(bytea) nativo de PostgreSQL (independiente del schema de pgcrypto);
--    la app usa Web Crypto (`@opai/domain`).

-- Un único DO de nivel superior: permite COMMIT por lote, sin transacción externa.
-- Prisma/Postgres lo ejecutan en autocommit; no envolver en BEGIN ni --single-transaction.
DO $$
DECLARE
  v_tenant UUID;
  v_cantidad INTEGER;
BEGIN
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE IF NOT EXISTS "core"."auditoria_cabezas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ultimo_seq" INTEGER,
    "verificada_en" TIMESTAMPTZ(6),
    "verificacion_ok" BOOLEAN,
    "ultimo_hash" TEXT,
    "huella_prefijo" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auditoria_cabezas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auditoria_cabezas_tenant_id_fkey" FOREIGN KEY ("tenant_id")
      REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "auditoria_cabezas_tenant_id_key" ON "core"."auditoria_cabezas"("tenant_id");
ALTER TABLE core.auditoria_cabezas
  ADD COLUMN IF NOT EXISTS ultimo_hash TEXT,
  ADD COLUMN IF NOT EXISTS huella_prefijo TEXT,
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;

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

REVOKE UPDATE, DELETE ON "core"."audit_events" FROM opai_app;
COMMIT; -- Libera el lock de DDL ANTES del backfill.

-- Captura tenants históricos. El código viejo puede seguir insertando NULL: fase 2 los completa.
FOR v_tenant IN SELECT DISTINCT tenant_id FROM core.audit_events WHERE seq IS NULL LOOP
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant::text, 0));
    WITH RECURSIVE
    cabeza AS (
      SELECT coalesce((SELECT seq FROM core.audit_events WHERE tenant_id = v_tenant
        AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1), 0) AS seq,
        coalesce((SELECT hash FROM core.audit_events WHERE tenant_id = v_tenant
        AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1), repeat('0', 64)) AS hash
    ),
    pendientes AS MATERIALIZED (
      SELECT e.*, row_number() OVER (ORDER BY created_at, id)::int AS n
      FROM (SELECT * FROM core.audit_events WHERE tenant_id = v_tenant AND seq IS NULL
        ORDER BY created_at, id LIMIT 1000) e
    ),
    canones AS MATERIALIZED (
      SELECT p.id, p.n, c.seq + p.n AS seq,
        jsonb_build_array(p.tenant_id::text, c.seq + p.n, p.actor_type, p.actor_id,
          p.via_user_id, p.capability, p.entity_type, p.entity_id,
          to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          encode(sha256(convert_to(coalesce(p.payload::text, 'null'), 'UTF8')), 'hex'))::text AS canon
      FROM pendientes p CROSS JOIN cabeza c
    ),
    cadena AS (
      SELECT p.*, c.hash AS previo,
        encode(sha256(convert_to(c.hash || E'\n' || p.canon, 'UTF8')), 'hex') AS hash
      FROM canones p CROSS JOIN cabeza c WHERE p.n = 1
      UNION ALL
      SELECT p.*, c.hash,
        encode(sha256(convert_to(c.hash || E'\n' || p.canon, 'UTF8')), 'hex')
      FROM canones p JOIN cadena c ON p.n = c.n + 1
    )
    UPDATE core.audit_events e SET seq = c.seq, hash_anterior = c.previo,
      hash = c.hash, hash_canon = c.canon FROM cadena c WHERE e.id = c.id AND e.tenant_id = v_tenant;
    GET DIAGNOSTICS v_cantidad = ROW_COUNT;
    COMMIT; -- Solo locks de filas/lote y del tenant; nunca ACCESS EXCLUSIVE durante el recorrido.
    EXIT WHEN v_cantidad < 1000;
  END LOOP;
END LOOP;
END $$;
