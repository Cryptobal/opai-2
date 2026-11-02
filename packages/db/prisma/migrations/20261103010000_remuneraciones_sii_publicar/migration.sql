-- CAR-148 · Publicación automática UF/UTM del SII en valores_publicados (opai_app INSERT/UPDATE).
BEGIN;
SET LOCAL lock_timeout = '5s';

GRANT INSERT, UPDATE ON "core"."valores_publicados" TO opai_app;

UPDATE "core"."indicadores_legales"
SET
  "fuente_primaria" = 'SII',
  "fuente_contraste" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "clave" IN ('uf', 'utm');

COMMIT;

-- Reversión: snapshot Neon previo.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- REVOKE INSERT, UPDATE ON "core"."valores_publicados" FROM opai_app;
-- UPDATE "core"."indicadores_legales"
-- SET "fuente_primaria" = 'SII', "fuente_contraste" = 'Banco Central', "updated_at" = CURRENT_TIMESTAMP
-- WHERE "clave" IN ('uf', 'utm');
-- COMMIT;
