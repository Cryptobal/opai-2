-- CAR-544: cotización enviada ficticia en `qa-e2e` para capturar la ficha «Documento y envío» en `preview-e2e`.
-- Idempotente, solo `qa-e2e` (nunca Gard). Se aplica en `main` y en cada rama `preview/pr-N`
-- (`packages/db/scripts/qa-e2e/aplicar-en-preview.sh` en el workflow `preview`).

DO $$
DECLARE
  t uuid := (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');
  cuenta_fija uuid := '00000000-0000-7000-8000-000000267001'::uuid;
  cuenta uuid;
  embudo uuid;
  etapa uuid;
  owner uuid;
  negocio uuid := '00000000-0000-7000-8000-000000544001'::uuid;
  cot uuid := '00000000-0000-7000-8000-000000544002'::uuid;
  ver uuid := '00000000-0000-7000-8000-000000544003'::uuid;
  anio_corr int := 2026;
BEGIN
  IF t IS NULL THEN
    RAISE EXCEPTION 'No existe la empresa ficticia qa-e2e';
  END IF;
  SELECT m.user_id INTO owner
  FROM core.memberships m
  WHERE m.tenant_id = t AND m.rol IN ('owner', 'admin')
  ORDER BY CASE WHEN m.rol = 'owner' THEN 0 ELSE 1 END
  LIMIT 1;
  IF owner IS NULL THEN
    SELECT user_id INTO owner FROM core.memberships WHERE tenant_id = t LIMIT 1;
  END IF;
  SELECT e.id, et.id INTO embudo, etapa
  FROM comercial.embudos e
  JOIN comercial.etapas et ON et.embudo_id = e.id AND et.tenant_id = e.tenant_id
  WHERE e.tenant_id = t AND e.por_defecto AND et.activa AND et.tipo = 'abierta'
  ORDER BY et.orden
  LIMIT 1;
  IF embudo IS NULL OR etapa IS NULL OR owner IS NULL THEN
    RAISE EXCEPTION 'qa-e2e sin embudo, etapa abierta u owner';
  END IF;

  INSERT INTO core.cuentas (id, tenant_id, nombre, rut, estado, updated_at)
  VALUES (cuenta_fija, t, 'Cliente ficticio QA CPQ preview', '76999002-K', 'cliente_activo', now())
  ON CONFLICT (id) DO NOTHING;
  SELECT COALESCE(
    (SELECT id FROM core.cuentas WHERE tenant_id = t AND id = cuenta_fija),
    (SELECT id FROM core.cuentas WHERE tenant_id = t ORDER BY created_at LIMIT 1)
  ) INTO cuenta;
  IF cuenta IS NULL THEN
    RAISE EXCEPTION 'qa-e2e sin cuenta para cotización preview';
  END IF;

  INSERT INTO comercial.negocios
    (id, tenant_id, cuenta_id, embudo_id, etapa_id, estado, titulo, responsable_id, created_at, updated_at)
  VALUES
    (negocio, t, cuenta, embudo, etapa, 'abierto', 'Negocio ficticio CPQ preview', owner, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cpq.cotizaciones
    (id, tenant_id, codigo, negocio_id, titulo, vigente, creado_por_id, created_at, updated_at)
  VALUES
    (cot, t, 'CPQ-2026-901', negocio, 'Cotización ficticia preview', true, owner, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cpq.versiones
    (id, tenant_id, cotizacion_id, numero, estado, moneda, enviada_en, creado_por_id, created_at, updated_at)
  VALUES
    (ver, t, cot, 1, 'enviada', 'CLP', now(), owner, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cpq.correlativos (id, tenant_id, anio, ultimo, created_at, updated_at)
  VALUES ('00000000-0000-7000-8000-000000544004'::uuid, t, anio_corr, 901, now(), now())
  ON CONFLICT (tenant_id, anio) DO UPDATE SET ultimo = GREATEST(cpq.correlativos.ultimo, 901), updated_at = now();
END $$;