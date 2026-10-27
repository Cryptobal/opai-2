-- Fuera de transacción: Prisma PostgreSQL no envuelve automáticamente cada migration.sql.
-- Aplicación manual: psql "$DATABASE_URL_MIGRATE" -v ON_ERROR_STOP=1 -f este_archivo
-- NO usar BEGIN ni --single-transaction. Si falla, revisar indisvalid y retirar SOLO el índice
-- inválido con DROP INDEX CONCURRENTLY antes de reintentar (runbook en el brief del PR #71).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "audit_events_tenant_id_seq_key"
  ON "core"."audit_events"("tenant_id", "seq");
