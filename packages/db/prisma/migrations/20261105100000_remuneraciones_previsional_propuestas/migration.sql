-- CAR-193 · Captura mensual de indicadores previsionales (Previred): el cron propone y una persona aprueba.
-- Aditiva: dos columnas, un índice y dos funciones SECURITY DEFINER. No toca valores existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."valores_publicados"
  ADD COLUMN IF NOT EXISTS "resuelto_por_id" uuid,
  ADD COLUMN IF NOT EXISTS "resuelto_en" timestamptz;

-- Una sola propuesta pendiente por indicador.
CREATE UNIQUE INDEX IF NOT EXISTS "valores_publicados_indicador_propuesto_idx"
  ON "core"."valores_publicados" ("indicador_id") WHERE "estado" = 'propuesto';

-- El cron (opai_cron_sii) propone o renueva. Devuelve 'renovado' | 'propuesto'.
CREATE OR REPLACE FUNCTION "core"."remuneraciones_proponer_previsional"(
  p_clave text,
  p_valor jsonb,
  p_vigente_desde date,
  p_fuente text,
  p_consultada date
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_hoy date := (clock_timestamp() AT TIME ZONE 'America/Santiago')::date;
  v_indicador_id uuid;
  v_actual "core"."valores_publicados"%ROWTYPE;
  v_pendiente "core"."valores_publicados"%ROWTYPE;
BEGIN
  IF p_clave NOT IN ('imm', 'topes', 'afp', 'sis', 'cesantia') THEN
    RAISE EXCEPTION 'proponer_previsional: clave inválida %', p_clave USING ERRCODE = 'check_violation';
  END IF;
  IF p_fuente IS NULL OR p_fuente !~ '^https://(www\.)?(previred\.com|spensiones\.cl)/' THEN
    RAISE EXCEPTION 'proponer_previsional: fuente inválida' USING ERRCODE = 'check_violation';
  END IF;
  IF p_vigente_desde <> date_trunc('month', v_hoy)::date THEN
    RAISE EXCEPTION 'proponer_previsional: vigente_desde fuera de ventana' USING ERRCODE = 'check_violation';
  END IF;
  IF p_consultada IS NULL OR p_consultada NOT BETWEEN v_hoy - 1 AND v_hoy THEN
    RAISE EXCEPTION 'proponer_previsional: fecha de consulta fuera de ventana' USING ERRCODE = 'check_violation';
  END IF;
  IF p_valor IS NULL OR jsonb_typeof(p_valor) = 'null' THEN
    RAISE EXCEPTION 'proponer_previsional: valor inválido' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_indicador_id FROM "core"."indicadores_legales" WHERE clave = p_clave;
  IF v_indicador_id IS NULL THEN
    RAISE EXCEPTION 'proponer_previsional: indicador % inexistente', p_clave USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('core:remuneraciones:previsional:' || p_clave, 0));

  SELECT * INTO v_actual FROM "core"."valores_publicados"
    WHERE indicador_id = v_indicador_id AND estado = 'vigente'
    ORDER BY vigente_desde DESC LIMIT 1 FOR UPDATE;
  IF v_actual.id IS NULL THEN
    RAISE EXCEPTION 'proponer_previsional: % sin valor vigente de partida', p_clave USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_typeof(p_valor) <> jsonb_typeof(v_actual.valor_json) THEN
    RAISE EXCEPTION 'proponer_previsional: forma distinta al vigente' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_pendiente FROM "core"."valores_publicados"
    WHERE indicador_id = v_indicador_id AND estado = 'propuesto' FOR UPDATE;

  IF v_actual.valor_json = p_valor THEN
    -- Solo la fecha de consulta; la fuente se pisa únicamente si ya era una fuente oficial (no una evidencia sembrada).
    UPDATE "core"."valores_publicados"
      SET consultada_el = p_consultada,
          fuente = CASE WHEN fuente ~ '^https://(www\.)?(previred\.com|spensiones\.cl)/' THEN p_fuente ELSE fuente END
      WHERE id = v_actual.id;
    IF v_pendiente.id IS NOT NULL THEN
      UPDATE "core"."valores_publicados" SET estado = 'rechazado', resuelto_en = clock_timestamp()
        WHERE id = v_pendiente.id;
    END IF;
    RETURN 'renovado';
  END IF;

  IF v_pendiente.id IS NOT NULL THEN
    IF v_pendiente.valor_json = p_valor THEN
      UPDATE "core"."valores_publicados"
        SET consultada_el = p_consultada, fuente = p_fuente WHERE id = v_pendiente.id;
      RETURN 'propuesto';
    END IF;
    UPDATE "core"."valores_publicados" SET estado = 'rechazado', resuelto_en = clock_timestamp()
      WHERE id = v_pendiente.id;
  END IF;

  INSERT INTO "core"."valores_publicados" (
    id, indicador_id, valor_json, vigente_desde, estado, fuente, consultada_el, verificacion
  ) VALUES (
    gen_random_uuid(), v_indicador_id, p_valor, GREATEST(p_vigente_desde, v_actual.vigente_desde + 1), 'propuesto', p_fuente, p_consultada, 'por_verificar'
  );
  RETURN 'propuesto';
END;
$$;

-- Una persona (con rol de plataforma, verificado en la capacidad) aprueba o rechaza una propuesta.
CREATE OR REPLACE FUNCTION "core"."remuneraciones_resolver_propuesta"(
  p_id uuid,
  p_aprobar boolean,
  p_actor uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_propuesta "core"."valores_publicados"%ROWTYPE;
  v_actual "core"."valores_publicados"%ROWTYPE;
BEGIN
  IF p_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM "core"."users" WHERE id = p_actor AND platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'resolver_propuesta: el actor no es owner de plataforma' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO v_propuesta FROM "core"."valores_publicados" WHERE id = p_id;
  IF v_propuesta.id IS NULL OR v_propuesta.estado <> 'propuesto' THEN
    RAISE EXCEPTION 'resolver_propuesta: no hay propuesta pendiente con ese id' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('core:remuneraciones:previsional:' ||
    (SELECT clave FROM "core"."indicadores_legales" WHERE id = v_propuesta.indicador_id), 0));

  SELECT * INTO v_propuesta FROM "core"."valores_publicados" WHERE id = p_id FOR UPDATE;
  IF v_propuesta.estado <> 'propuesto' THEN
    RAISE EXCEPTION 'resolver_propuesta: la propuesta ya fue resuelta' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT p_aprobar THEN
    UPDATE "core"."valores_publicados"
      SET estado = 'rechazado', resuelto_por_id = p_actor, resuelto_en = clock_timestamp() WHERE id = p_id;
    RETURN 'rechazado';
  END IF;

  SELECT * INTO v_actual FROM "core"."valores_publicados"
    WHERE indicador_id = v_propuesta.indicador_id AND estado = 'vigente'
    ORDER BY vigente_desde DESC LIMIT 1 FOR UPDATE;
  IF v_actual.id IS NOT NULL THEN
    IF v_propuesta.vigente_desde <= v_actual.vigente_desde THEN
      RAISE EXCEPTION 'resolver_propuesta: la vigencia no es posterior al valor vigente'
        USING ERRCODE = 'check_violation';
    END IF;
    UPDATE "core"."valores_publicados"
      SET vigente_hasta = v_propuesta.vigente_desde - 1 WHERE id = v_actual.id;
  END IF;
  UPDATE "core"."valores_publicados"
    SET estado = 'vigente', verificacion = 'verificado', resuelto_por_id = p_actor, resuelto_en = clock_timestamp()
    WHERE id = p_id;
  RETURN 'aprobado';
END;
$$;

REVOKE ALL ON FUNCTION "core"."remuneraciones_proponer_previsional"(text, jsonb, date, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION "core"."remuneraciones_proponer_previsional"(text, jsonb, date, text, date) FROM opai_app;
GRANT EXECUTE ON FUNCTION "core"."remuneraciones_proponer_previsional"(text, jsonb, date, text, date) TO opai_cron_sii;
REVOKE ALL ON FUNCTION "core"."remuneraciones_resolver_propuesta"(uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."remuneraciones_resolver_propuesta"(uuid, boolean, uuid) TO opai_app;

UPDATE "core"."indicadores_legales"
SET "fuente_primaria" = 'Previred', "fuente_contraste" = 'Superintendencia de Pensiones',
    "lectura_automatica" = true, "updated_at" = CURRENT_TIMESTAMP
WHERE "clave" IN ('imm', 'topes', 'afp', 'sis', 'cesantia');

DO $$
DECLARE v_filas integer;
BEGIN
  SELECT count(*) INTO v_filas FROM "core"."indicadores_legales"
    WHERE "clave" IN ('imm', 'topes', 'afp', 'sis', 'cesantia') AND "lectura_automatica";
  IF v_filas <> 5 THEN
    RAISE EXCEPTION 'previsional: se esperaban 5 indicadores marcados y hay %', v_filas;
  END IF;
END $$;

COMMIT;

-- Reversión: snapshot Neon previo. A mano solo sirve si todavía no se aprobó ni rechazó ninguna propuesta
-- (el DROP COLUMN pierde quién resolvió y las filas resueltas no vuelven a su estado):
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- DROP FUNCTION IF EXISTS "core"."remuneraciones_resolver_propuesta"(uuid, boolean, uuid);
-- DROP FUNCTION IF EXISTS "core"."remuneraciones_proponer_previsional"(text, jsonb, date, text, date);
-- UPDATE "core"."indicadores_legales" SET "lectura_automatica" = false, "fuente_primaria" = NULL, "fuente_contraste" = NULL
--   WHERE "clave" IN ('imm', 'topes', 'afp', 'sis', 'cesantia');  -- verificar contra la semilla 20261102190000 l.116-121
-- DROP INDEX IF EXISTS "core"."valores_publicados_indicador_propuesto_idx";
-- ALTER TABLE "core"."valores_publicados" DROP COLUMN IF EXISTS "resuelto_por_id", DROP COLUMN IF EXISTS "resuelto_en";
-- COMMIT;
