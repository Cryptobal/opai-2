-- CAR-148 · Publicación UF/UTM del SII vía función SECURITY DEFINER (sin GRANT directo a opai_app).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE UNIQUE INDEX IF NOT EXISTS "valores_publicados_indicador_vigente_desde_vigente_idx"
  ON "core"."valores_publicados" ("indicador_id", "vigente_desde")
  WHERE "estado" = 'vigente';

CREATE OR REPLACE FUNCTION "core"."remuneraciones_publicar_sii"(
  p_clave text,
  p_valor bigint,
  p_vigente_desde date,
  p_fuente text,
  p_consultada_en timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_indicador_id uuid;
  v_actual "core"."valores_publicados"%ROWTYPE;
  v_anterior bigint;
  v_max_ratio numeric;
  v_id uuid;
BEGIN
  IF p_clave NOT IN ('uf', 'utm') THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: clave inválida %', p_clave USING ERRCODE = 'check_violation';
  END IF;
  IF p_fuente IS NULL OR p_fuente !~ '^https://(www\.)?sii\.cl/' THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: fuente SII inválida' USING ERRCODE = 'check_violation';
  END IF;
  IF p_valor IS NULL OR p_valor < 1 THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: valor inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF p_clave = 'uf' AND (p_valor < 1000000 OR p_valor > 20000000) THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: UF fuera de rango' USING ERRCODE = 'check_violation';
  END IF;
  IF p_clave = 'utm' AND (p_valor < 10000 OR p_valor > 500000) THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: UTM fuera de rango' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_indicador_id FROM "core"."indicadores_legales" WHERE clave = p_clave;
  IF v_indicador_id IS NULL THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: indicador % inexistente', p_clave USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('core:remuneraciones:publicar_sii:' || p_clave, 0));

  SELECT * INTO v_actual
    FROM "core"."valores_publicados"
    WHERE indicador_id = v_indicador_id AND estado = 'vigente'
    ORDER BY vigente_desde DESC
    LIMIT 1
    FOR UPDATE;

  IF v_actual.id IS NOT NULL AND p_vigente_desde < v_actual.vigente_desde THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: vigente_desde anterior al vigente'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_actual.id IS NOT NULL THEN
    v_anterior := (v_actual.valor_json::text)::bigint;
    IF v_anterior IS NOT NULL AND v_anterior > 0 AND p_valor <> v_anterior THEN
      v_max_ratio := CASE WHEN p_clave = 'uf' THEN 0.05 ELSE 0.25 END;
      IF abs(p_valor - v_anterior)::numeric / v_anterior::numeric > v_max_ratio THEN
        RAISE EXCEPTION 'remuneraciones_publicar_sii: variación excesiva'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  IF v_actual.id IS NOT NULL
     AND v_actual.vigente_desde = p_vigente_desde
     AND (v_actual.valor_json::text)::bigint = p_valor THEN
    RETURN v_actual.id;
  END IF;

  IF v_actual.id IS NOT NULL AND v_actual.vigente_desde = p_vigente_desde THEN
    UPDATE "core"."valores_publicados"
      SET valor_json = to_jsonb(p_valor),
          fuente = p_fuente,
          consultada_el = p_consultada_en::date,
          verificacion = 'verificado',
          vigente_hasta = NULL
      WHERE id = v_actual.id;
    RETURN v_actual.id;
  END IF;

  IF v_actual.id IS NOT NULL AND v_actual.vigente_desde < p_vigente_desde THEN
    UPDATE "core"."valores_publicados"
      SET vigente_hasta = p_vigente_desde - 1
      WHERE id = v_actual.id;
  END IF;

  v_id := gen_random_uuid();
  INSERT INTO "core"."valores_publicados" (
    id, indicador_id, valor_json, vigente_desde, estado, fuente, consultada_el, verificacion
  ) VALUES (
    v_id, v_indicador_id, to_jsonb(p_valor), p_vigente_desde, 'vigente', p_fuente, p_consultada_en::date, 'verificado'
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) TO opai_app;

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
-- REVOKE ALL ON FUNCTION "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz) FROM opai_app;
-- DROP FUNCTION IF EXISTS "core"."remuneraciones_publicar_sii"(text, bigint, date, text, timestamptz);
-- DROP INDEX IF EXISTS "core"."valores_publicados_indicador_vigente_desde_vigente_idx";
-- UPDATE "core"."indicadores_legales"
-- SET "fuente_primaria" = 'SII', "fuente_contraste" = 'Banco Central', "updated_at" = CURRENT_TIMESTAMP
-- WHERE "clave" IN ('uf', 'utm');
-- COMMIT;
