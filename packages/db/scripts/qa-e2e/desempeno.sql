-- Desempeño de prueba para la empresa ficticia qa-e2e (CAR-380): el cargo «Guardia» con un scorecard publicado
-- desde el mes en curso y la persona ficticia de qa-e2e con vínculo de Guardia, para que `preview-e2e` capture el
-- equipo del cargo y el resultado de una persona. Idempotente y solo para qa-e2e (nunca Gard ni datos reales).
-- Se corre en la rama de vista previa del PR, o en `dev`/`main` con OK de Carlos.
DO $$
DECLARE
  t uuid := (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');
  cargo uuid := (SELECT id FROM core.cargos WHERE tenant_id = t AND nombre = 'Guardia');
  persona uuid := (SELECT id FROM core.personas WHERE tenant_id = t ORDER BY created_at LIMIT 1);
  mes text := to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY-MM');
BEGIN
  IF t IS NULL OR cargo IS NULL OR persona IS NULL THEN
    RAISE EXCEPTION 'qa-e2e no tiene cargo Guardia o persona';
  END IF;
  PERFORM set_config('app.tenant_id', t::text, true);
  INSERT INTO core.vinculos_laborales (id, tenant_id, persona_id, cargo_id, tipo, inicio, estado, updated_at)
    VALUES ('00000000-0000-7000-8000-0000000e2201', t, persona, cargo, 'indefinido', '2026-01-01', 'vigente', now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO desempeno.scorecards (id, tenant_id, cargo_id, vigente_desde, estado, persona_ve_resultado, publicado_en, updated_at)
    VALUES ('00000000-0000-7000-8000-0000000e2211', t, cargo, mes, 'publicado', true, now(), now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO desempeno.scorecard_indicadores (id, tenant_id, scorecard_id, indicador, meta, peso, updated_at)
    VALUES ('00000000-0000-7000-8000-0000000e2212', t, '00000000-0000-7000-8000-0000000e2211', 'asistencia.ausentismo', 5, 100, now())
  ON CONFLICT (id) DO NOTHING;
END $$;
