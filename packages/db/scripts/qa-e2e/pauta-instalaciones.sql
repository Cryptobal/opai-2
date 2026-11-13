-- Pauta de prueba para la empresa ficticia qa-e2e (CAR-330, CAR-373): dos instalaciones con puestos y serie,
-- para que `preview-e2e` capture el informe «Por instalación» y la vista previa de un permiso desde la ficha.
-- Idempotente y solo para qa-e2e (nunca Gard ni datos reales). Se corre en la rama de vista previa del PR, o en
-- `dev`/`main` con OK de Carlos. Titular: la primera persona de qa-e2e (ficticia).
DO $$
DECLARE
  t uuid := (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');
  cuenta uuid := (SELECT id FROM core.cuentas WHERE tenant_id = t ORDER BY created_at LIMIT 1);
  cargo uuid := (SELECT id FROM core.cargos WHERE tenant_id = t AND nombre = 'Guardia');
  patron uuid := (SELECT id FROM core.patrones_turno WHERE tenant_id = t AND nombre = '4×4');
  persona uuid := (SELECT id FROM core.personas WHERE tenant_id = t ORDER BY created_at LIMIT 1);
  inicio date := date_trunc('month', now() AT TIME ZONE 'America/Santiago')::date;
BEGIN
  IF t IS NULL OR cuenta IS NULL OR cargo IS NULL OR patron IS NULL THEN
    RAISE EXCEPTION 'qa-e2e no tiene cuenta, cargo Guardia o patrón 4×4';
  END IF;
  PERFORM set_config('app.tenant_id', t::text, true);
  IF NOT EXISTS (SELECT 1 FROM core.tenant_modules WHERE tenant_id = t AND modulo_id = 'pauta') THEN
    RAISE EXCEPTION 'qa-e2e no tiene el módulo Pauta';
  END IF;
  INSERT INTO core.instalaciones (id, tenant_id, cuenta_id, nombre, updated_at) VALUES
    ('00000000-0000-7000-8000-0000000e2101', t, cuenta, 'Planta Norte QA', now()),
    ('00000000-0000-7000-8000-0000000e2102', t, cuenta, 'Bodega Sur QA', now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO core.puestos (id, tenant_id, instalacion_id, cargo_id, nombre, dias_trabajo, dias_descanso, hora_inicio, hora_fin, updated_at) VALUES
    ('00000000-0000-7000-8000-0000000e2111', t, '00000000-0000-7000-8000-0000000e2101', cargo, 'Portería Día', 4, 4, '08:00', '20:00', now()),
    ('00000000-0000-7000-8000-0000000e2112', t, '00000000-0000-7000-8000-0000000e2101', cargo, 'Portería Noche', 4, 4, '20:00', '08:00', now()),
    ('00000000-0000-7000-8000-0000000e2113', t, '00000000-0000-7000-8000-0000000e2102', cargo, 'Acceso Día', 4, 4, '08:00', '20:00', now())
  ON CONFLICT (id) DO NOTHING;
  -- Portería Día con titular (cubierta); Portería Noche y Acceso Día sin titular (por cubrir).
  INSERT INTO pauta.series (id, tenant_id, puesto_id, patron_id, inicio_ciclo, titular_persona_id, vigente_desde, updated_at) VALUES
    ('00000000-0000-7000-8000-0000000e2121', t, '00000000-0000-7000-8000-0000000e2111', patron, inicio, persona, inicio, now()),
    ('00000000-0000-7000-8000-0000000e2122', t, '00000000-0000-7000-8000-0000000e2112', patron, inicio, NULL, inicio, now()),
    ('00000000-0000-7000-8000-0000000e2123', t, '00000000-0000-7000-8000-0000000e2113', patron, inicio + 4, NULL, inicio, now())
  ON CONFLICT (id) DO NOTHING;
END $$;
