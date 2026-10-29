-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
-- Copia este archivo a migrations/<AAAAMMDDHHMMSS>_<nombre>/migration.sql y reemplaza los «…».
-- Lo verifica packages/db/test/migraciones-plantilla.test.ts (en `pnpm test`).
--
-- Qué hace y por qué: …
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
-- Migración de datos: verificar filas afectadas con GET DIAGNOSTICS + RAISE (FORCE RLS filtra en silencio).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- … cambios aditivos …

COMMIT;

-- Reversión: … (SQL que deshace cada cambio, en orden inverso; o por qué no aplica y cómo se restaura
-- desde el snapshot previo de Neon).
