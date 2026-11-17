-- Vínculo terminado ficticio para `preview-e2e` de la ficha de finiquito (CAR-99). Solo `qa-e2e`.
-- Activa el complemento Cumplimiento DT y deja sueldo de referencia para líneas del cálculo.
-- Idempotente. Se corre en la rama de vista previa del PR o en `main`/`dev` con OK de Carlos.
DO $$
DECLARE
  t uuid := (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');
  cargo uuid := (SELECT id FROM core.cargos WHERE tenant_id = t AND nombre = 'Guardia' LIMIT 1);
  persona uuid := (SELECT id FROM core.personas WHERE tenant_id = t ORDER BY created_at LIMIT 1);
  vinculo uuid := '00000000-0000-7000-8000-0000000e2399';
  estructura uuid := '00000000-0000-7000-8000-0000000e239a';
BEGIN
  IF t IS NULL OR cargo IS NULL OR persona IS NULL THEN
    RAISE EXCEPTION 'qa-e2e no tiene cargo Guardia o persona';
  END IF;
  PERFORM set_config('app.tenant_id', t::text, true);
  INSERT INTO core.tenant_modules (id, tenant_id, modulo_id, estado, updated_at)
    VALUES ('00000000-0000-7000-8000-0000000e239b', t, 'nomina', 'activo', now())
  ON CONFLICT (tenant_id, modulo_id) DO NOTHING;
  INSERT INTO core.tenant_modules (id, tenant_id, modulo_id, estado, updated_at)
    VALUES ('00000000-0000-7000-8000-0000000e239c', t, 'nomina.cumplimiento_dt', 'activo', now())
  ON CONFLICT (tenant_id, modulo_id) DO NOTHING;
  INSERT INTO core.vinculos_laborales (
    id, tenant_id, persona_id, cargo_id, tipo, inicio, termino, estado, motivo_termino, updated_at
  )
    VALUES (
      vinculo, t, persona, cargo, 'indefinido', '2022-03-01', '2026-08-30', 'terminado',
      'necesidades de la empresa', now()
    )
  ON CONFLICT (id) DO UPDATE SET
    estado = EXCLUDED.estado,
    termino = EXCLUDED.termino,
    motivo_termino = EXCLUDED.motivo_termino,
    updated_at = now();
  INSERT INTO core.estructuras_sueldo (
    id, tenant_id, nivel, persona_id, sueldo_base, colacion, movilizacion, gratificacion,
    vigente_desde, estado, motivo, updated_at
  )
    VALUES (
      estructura, t, 'persona', persona, 500000, 0, 0, 'legal_25', '2022-03-01', 'vigente', 'qa-e2e finiquito', now()
    )
  ON CONFLICT (id) DO NOTHING;
END $$;