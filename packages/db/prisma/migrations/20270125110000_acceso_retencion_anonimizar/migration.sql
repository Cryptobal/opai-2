-- CAR-482 · R18: anonimización diaria de registros e intentos vencidos (hecho conservado, ADR-023).
-- opai_app no puede hacer UPDATE en estas tablas; la aplica una función SECURITY DEFINER bajo el tenant fijado.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "acceso"."registros_acceso" ADD COLUMN "anonimizado_en" TIMESTAMPTZ(6);
ALTER TABLE "acceso"."intentos_denegados" ADD COLUMN "anonimizado_en" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "registros_acceso_retencion_idx"
  ON "acceso"."registros_acceso"("tenant_id", "hora_corregida")
  WHERE "anonimizado_en" IS NULL;
CREATE INDEX IF NOT EXISTS "intentos_denegados_retencion_idx"
  ON "acceso"."intentos_denegados"("tenant_id", "hora_corregida")
  WHERE "anonimizado_en" IS NULL;

CREATE OR REPLACE FUNCTION acceso.anonimizar_registros_vencidos(p_corte TIMESTAMPTZ, p_tope INT)
RETURNS INT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, acceso, core, pg_temp
AS $$
DECLARE
  v_tenant UUID;
  n INT;
BEGIN
  v_tenant := NULLIF(current_setting('app.tenant_id', true), '')::uuid;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Falta app.tenant_id';
  END IF;
  WITH sel AS (
    SELECT id FROM acceso.registros_acceso
    WHERE tenant_id = v_tenant
      AND anonimizado_en IS NULL
      AND hora_corregida < p_corte
    ORDER BY id
    LIMIT p_tope
    FOR UPDATE
  )
  UPDATE acceso.registros_acceso r SET
    nombre = '[anonimizado]',
    empresa = NULL,
    patente = NULL,
    motivo_visita = NULL,
    campos_extra = '[]'::jsonb,
    persona_id = NULL,
    anonimizado_en = NOW()
  FROM sel WHERE r.id = sel.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION acceso.anonimizar_intentos_vencidos(p_corte TIMESTAMPTZ, p_tope INT)
RETURNS INT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, acceso, core, pg_temp
AS $$
DECLARE
  v_tenant UUID;
  n INT;
BEGIN
  v_tenant := NULLIF(current_setting('app.tenant_id', true), '')::uuid;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Falta app.tenant_id';
  END IF;
  WITH sel AS (
    SELECT id FROM acceso.intentos_denegados
    WHERE tenant_id = v_tenant
      AND anonimizado_en IS NULL
      AND hora_corregida < p_corte
    ORDER BY id
    LIMIT p_tope
    FOR UPDATE
  )
  UPDATE acceso.intentos_denegados i SET
    persona_id = NULL,
    anonimizado_en = NOW()
  FROM sel WHERE i.id = sel.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION acceso.anonimizar_registros_vencidos(TIMESTAMPTZ, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION acceso.anonimizar_intentos_vencidos(TIMESTAMPTZ, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION acceso.anonimizar_registros_vencidos(TIMESTAMPTZ, INT) TO opai_app;
GRANT EXECUTE ON FUNCTION acceso.anonimizar_intentos_vencidos(TIMESTAMPTZ, INT) TO opai_app;

COMMIT;

-- Reversión (manual): DROP FUNCTION; ALTER TABLE DROP COLUMN anonimizado_en; DROP INDEX.