-- Central de prueba para la empresa ficticia qa-e2e (CAR-472): activa el módulo Central y deja tres alertas en
-- dos instalaciones (crítica y media en una, alta en otra), cada una con su hecho de apertura, para que
-- `preview-e2e` capture la cola agrupada por instalación y la ficha de una alerta. Idempotente y solo para
-- qa-e2e (nunca Gard ni datos reales). Se corre en la rama de vista previa del PR, o en `dev`/`main` con OK de
-- Carlos. Usa las instalaciones de pauta-instalaciones.sql o, si no están, las dos primeras de qa-e2e.
DO $$
DECLARE
  t uuid := (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');
  i1 uuid;
  i2 uuid;
BEGIN
  IF t IS NULL THEN
    RAISE EXCEPTION 'No existe la empresa qa-e2e';
  END IF;
  PERFORM set_config('app.tenant_id', t::text, true);
  SELECT id INTO i1 FROM core.instalaciones WHERE tenant_id = t ORDER BY created_at LIMIT 1;
  SELECT id INTO i2 FROM core.instalaciones WHERE tenant_id = t ORDER BY created_at OFFSET 1 LIMIT 1;
  IF i1 IS NULL THEN
    RAISE EXCEPTION 'qa-e2e no tiene instalaciones';
  END IF;
  i2 := coalesce(i2, i1);
  IF NOT EXISTS (SELECT 1 FROM core.tenant_modules WHERE tenant_id = t AND modulo_id = 'central') THEN
    INSERT INTO core.tenant_modules (id, tenant_id, modulo_id, estado, updated_at)
      VALUES ('00000000-0000-7000-8000-0000000e4701', t, 'central', 'activo', now());
  END IF;
  INSERT INTO central.alertas (id, tenant_id, instalacion_id, titulo, descripcion, severidad, origen, estado, created_at, updated_at) VALUES
    ('00000000-0000-7000-8000-0000000e4711', t, i1, 'Botón de emergencia en portería', 'Prueba ficticia de qa-e2e.', 'critica', 'manual', 'nueva', now() - interval '4 minutes', now()),
    ('00000000-0000-7000-8000-0000000e4712', t, i1, 'Ronda nocturna sin completar', 'Prueba ficticia de qa-e2e.', 'media', 'manual', 'nueva', now() - interval '25 minutes', now()),
    ('00000000-0000-7000-8000-0000000e4713', t, i2, 'Guardia sin marca de inicio', 'Prueba ficticia de qa-e2e.', 'alta', 'manual', 'nueva', now() - interval '12 minutes', now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO central.alerta_eventos (id, tenant_id, alerta_id, tipo, actor_tipo, estado_hacia, created_at, updated_at) VALUES
    ('00000000-0000-7000-8000-0000000e4721', t, '00000000-0000-7000-8000-0000000e4711', 'abierta', 'sistema', 'nueva', now() - interval '4 minutes', now()),
    ('00000000-0000-7000-8000-0000000e4722', t, '00000000-0000-7000-8000-0000000e4712', 'abierta', 'sistema', 'nueva', now() - interval '25 minutes', now()),
    ('00000000-0000-7000-8000-0000000e4723', t, '00000000-0000-7000-8000-0000000e4713', 'abierta', 'sistema', 'nueva', now() - interval '12 minutes', now())
  ON CONFLICT (id) DO NOTHING;
END $$;
