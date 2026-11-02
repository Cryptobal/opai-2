-- CAR-148 · Ventana UF/UTM fijada a America/Santiago, sin días futuros y variación diaria acumulada.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION "core"."remuneraciones_publicar_sii"(
  p_clave text,
  p_valor bigint,
  p_vigente_desde date,
  p_fuente text,
  p_consultada_en timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_hoy date := (clock_timestamp() AT TIME ZONE 'America/Santiago')::date;
  v_indicador_id uuid;
  v_actual "core"."valores_publicados"%ROWTYPE;
  v_referencia "core"."valores_publicados"%ROWTYPE;
  v_anterior bigint;
  v_max_ratio numeric;
  v_ref_desde date;
  v_dias integer;
  v_id uuid;
BEGIN
  IF p_clave NOT IN ('uf', 'utm') THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: clave inválida %', p_clave USING ERRCODE = 'check_violation';
  END IF;
  IF p_clave = 'uf' AND (
    p_fuente IS NULL
    OR p_fuente !~ '^https://www\.sii\.cl/valores_y_fechas/uf/uf[0-9]{4}\.htm$'
  ) THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: fuente SII inválida' USING ERRCODE = 'check_violation';
  END IF;
  IF p_clave = 'utm' AND (
    p_fuente IS NULL
    OR p_fuente !~ '^https://www\.sii\.cl/valores_y_fechas/utm/utm[0-9]{4}\.htm$'
  ) THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: fuente SII inválida' USING ERRCODE = 'check_violation';
  END IF;
  IF p_clave = 'uf' AND (p_vigente_desde < v_hoy - 1 OR p_vigente_desde > v_hoy) THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: vigente_desde UF fuera de ventana'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_clave = 'utm' AND p_vigente_desde <> date_trunc('month', v_hoy)::date THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: vigente_desde UTM fuera de ventana'
      USING ERRCODE = 'check_violation';
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

  IF v_actual.id IS NOT NULL
     AND v_actual.vigente_desde = p_vigente_desde
     AND (v_actual.valor_json::text)::bigint <> p_valor THEN
    RAISE EXCEPTION 'remuneraciones_publicar_sii: mismo día con otro valor'
      USING ERRCODE = 'check_violation';
  END IF;

  v_ref_desde := CASE
    WHEN p_clave = 'uf' THEN p_vigente_desde - 1
    ELSE (date_trunc('month', p_vigente_desde)::date - interval '1 month')::date
  END;

  SELECT * INTO v_referencia
    FROM "core"."valores_publicados"
    WHERE indicador_id = v_indicador_id
      AND estado = 'vigente'
      AND vigente_desde = v_ref_desde
    LIMIT 1;

  IF v_referencia.id IS NULL THEN
    IF p_clave = 'utm' THEN
      RAISE EXCEPTION 'remuneraciones_publicar_sii: referencia mes anterior faltante'
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO v_referencia
      FROM "core"."valores_publicados"
      WHERE indicador_id = v_indicador_id
        AND estado = 'vigente'
        AND vigente_desde < p_vigente_desde
      ORDER BY vigente_desde DESC
      LIMIT 1;
  END IF;

  IF v_referencia.id IS NOT NULL THEN
    v_anterior := (v_referencia.valor_json::text)::bigint;
    v_dias := p_vigente_desde - v_referencia.vigente_desde;
    IF v_anterior IS NOT NULL AND v_anterior > 0 AND p_valor <> v_anterior AND v_dias > 0 THEN
      v_max_ratio := CASE
        WHEN p_clave = 'uf' THEN v_dias * 0.005
        ELSE (v_dias::numeric / 30.0) * 0.05
      END;
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

COMMIT;

-- Reversión: restaurar el cuerpo de `remuneraciones_publicar_sii` de `20261103010000_remuneraciones_sii_publicar`
-- (variación solo con referencia exacta D-1 / 1.º mes anterior). Mismo ACL que esa migración.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- CREATE OR REPLACE FUNCTION "core"."remuneraciones_publicar_sii"( ... cuerpo 20261103010000 ... );
-- COMMIT;
