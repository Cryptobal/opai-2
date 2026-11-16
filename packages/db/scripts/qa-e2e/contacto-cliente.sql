-- Contacto de cliente ficticio para `qa-e2e` (CAR-500): cuenta cliente activa con instalaciones de
-- `pauta-instalaciones.sql`, contacto y acceso al portal. El usuario debe existir con membresía «cliente»
-- (correo `cliente-qa-e2e@opai.test`, misma contraseña que el owner de prueba en `preview-e2e`).
-- Idempotente; solo `qa-e2e`. Aplicar en Neon `main` con respaldo.
DO $$
DECLARE
  t uuid := (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');
  cuenta uuid := '00000000-0000-7000-8000-0000000e2201';
  contacto uuid := '00000000-0000-7000-8000-0000000e2202';
  inst1 uuid := '00000000-0000-7000-8000-0000000e2101';
  m_id uuid;
  acceso uuid;
BEGIN
  IF t IS NULL THEN RAISE EXCEPTION 'qa-e2e no existe'; END IF;
  PERFORM set_config('app.tenant_id', t::text, true);

  INSERT INTO core.cuentas (id, tenant_id, nombre, estado, created_at, updated_at)
  VALUES (cuenta, t, 'Cliente cobertura QA', 'cliente_activo', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO core.contactos (id, tenant_id, cuenta_id, nombres, apellidos, email, estado, created_at, updated_at)
  VALUES (contacto, t, cuenta, 'Contacto', 'Cliente QA', 'cliente-qa-e2e@opai.test', 'activo', now(), now())
  ON CONFLICT (id) DO NOTHING;

  SELECT m.id INTO m_id
  FROM core.memberships m
  JOIN core.users u ON u.id = m.user_id
  WHERE m.tenant_id = t AND u.email = 'cliente-qa-e2e@opai.test' AND m.estado = 'activa'
  LIMIT 1;

  IF m_id IS NULL THEN
    RAISE NOTICE 'Falta usuario cliente-qa-e2e@opai.test: invitar con portal cliente antes del acceso';
    RETURN;
  END IF;

  INSERT INTO portal_cliente.accesos (
    id, tenant_id, membership_id, cuenta_id, contacto_id, estado, alcance, todas_instalaciones, created_at, updated_at
  ) VALUES (
    '00000000-0000-7000-8000-0000000e2203', t, m_id, cuenta, contacto, 'activo', 'completo', false, now(), now()
  )
  ON CONFLICT (tenant_id, membership_id) DO UPDATE
    SET cuenta_id = EXCLUDED.cuenta_id, contacto_id = EXCLUDED.contacto_id, estado = 'activo', updated_at = now();

  acceso := (SELECT id FROM portal_cliente.accesos WHERE tenant_id = t AND membership_id = m_id);

  INSERT INTO portal_cliente.acceso_instalaciones (id, tenant_id, acceso_id, instalacion_id, created_at, updated_at)
  VALUES
    ('00000000-0000-7000-8000-0000000e2211', t, acceso, inst1, now(), now()),
    ('00000000-0000-7000-8000-0000000e2212', t, acceso, '00000000-0000-7000-8000-0000000e2102', now(), now())
  ON CONFLICT (acceso_id, instalacion_id) DO NOTHING;
END $$;