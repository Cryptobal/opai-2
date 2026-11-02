-- CAR-148 · Solo el rol del cron de captura SII puede ejecutar `remuneraciones_publicar_sii`
-- (cierra la carrera «el primero que llega gana» vía opai_app; decisión Carlos 2-nov-2026).
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opai_cron_sii') THEN
    CREATE ROLE opai_cron_sii LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "core" TO opai_cron_sii;
GRANT SELECT ON "core"."indicadores_legales", "core"."valores_publicados" TO opai_cron_sii;
GRANT SELECT, INSERT ON "core"."capturas_indicador" TO opai_cron_sii;
GRANT SELECT, INSERT ON "core"."audit_events" TO opai_cron_sii;
GRANT EXECUTE ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz)
  TO opai_cron_sii;
GRANT EXECUTE ON FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz)
  TO opai_cron_sii;

ALTER POLICY tenant_isolation ON "core"."audit_events" TO opai_app, opai_cron_sii;

REVOKE ALL ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) FROM opai_app;

COMMIT;

-- Reversión: restaurar EXECUTE a opai_app y quitar el rol dedicado (rol propietario, transacción corta).
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- GRANT EXECUTE ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) TO opai_app;
-- REVOKE ALL ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) FROM opai_cron_sii;
-- REVOKE EXECUTE ON FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) FROM opai_cron_sii;
-- REVOKE SELECT, INSERT ON "core"."audit_events" FROM opai_cron_sii;
-- REVOKE SELECT, INSERT ON "core"."capturas_indicador" FROM opai_cron_sii;
-- REVOKE SELECT ON "core"."indicadores_legales", "core"."valores_publicados" FROM opai_cron_sii;
-- REVOKE USAGE ON SCHEMA "core" FROM opai_cron_sii;
-- ALTER POLICY tenant_isolation ON "core"."audit_events" TO opai_app;
-- DROP ROLE IF EXISTS opai_cron_sii;
-- COMMIT;
