-- Siembra de la empresa ficticia `qa-e2e` para las pruebas visuales `preview-e2e` (CAR-285, OK de Carlos del 11-nov-2026).
-- Una cuenta y una factura 33 «aceptada por el SII», ambas inventadas: en `qa-e2e` no hay credenciales del SII, así que
-- una prueba no puede crear una factura aceptada desde la pantalla. Sin ella no se alcanzan la hoja «Ceder factura»,
-- «Registrar cobro» ni «Nota de crédito».
--
-- Dónde se corre: en la rama `main` de Neon (test.opai.cl), de la que nacen las ramas de vista previa. Solo toca `qa-e2e`.
-- Es idempotente (IDs fijos, ON CONFLICT DO NOTHING) y no modifica nada si la empresa no existe. Nunca Gard ni datos reales.
-- El folio 990001 está fuera de cualquier rango CAF. Cada sentencia se corre por separado con el rol propietario.

INSERT INTO core.cuentas (id, tenant_id, nombre, updated_at)
SELECT '00000000-0000-7000-8000-000000267001'::uuid, t.id, 'Cliente ficticio QA E2E (cesión)', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

-- CAR-320: RUT ficticio y cliente activo para que aparezca al facturar (e2e `@preview` de destinatarios). Idempotente.
UPDATE core.cuentas SET rut = COALESCE(rut, '76999002-K'), estado = 'cliente_activo', updated_at = now()
WHERE id = '00000000-0000-7000-8000-000000267001'::uuid
  AND tenant_id = (SELECT id FROM core.tenants WHERE slug = 'qa-e2e');

INSERT INTO finanzas.documentos_emitidos
  (id, tenant_id, cuenta_id, tipo_dte, folio, fecha_emision, monto_neto, monto_iva, monto_total, estado_dte, glosa, updated_at)
SELECT '00000000-0000-7000-8000-000000267002'::uuid, t.id, '00000000-0000-7000-8000-000000267001'::uuid, 33, 990001,
       DATE '2026-11-02', 10000, 1900, 11900, 'aceptado', 'Servicio ficticio para pruebas visuales', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.documentos_emitidos_lineas (id, tenant_id, documento_id, orden, glosa, monto)
SELECT '00000000-0000-7000-8000-000000267003'::uuid, t.id, '00000000-0000-7000-8000-000000267002'::uuid, 0,
       'Servicio ficticio para pruebas visuales', 10000
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

-- CAR-320 (ADR-103): contacto de facturación ficticio y una factura vencida para ver a quién sale el recordatorio de
-- cobro (e2e `@preview` de cobranza). Correo en dominio reservado `.test`; idempotente; solo `qa-e2e`.
INSERT INTO core.contactos (id, tenant_id, cuenta_id, nombres, apellidos, email, es_principal, roles, updated_at)
SELECT '00000000-0000-7000-8000-000000320001'::uuid, t.id, '00000000-0000-7000-8000-000000267001'::uuid,
       'Contacto', 'Ficticio QA', 'pagos@qa-e2e.test', true, ARRAY['facturacion'], now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.documentos_emitidos
  (id, tenant_id, cuenta_id, tipo_dte, folio, fecha_emision, fecha_vencimiento, monto_neto, monto_iva, monto_total,
   estado_dte, glosa, updated_at)
SELECT '00000000-0000-7000-8000-000000320002'::uuid, t.id, '00000000-0000-7000-8000-000000267001'::uuid, 33, 990002,
       DATE '2026-09-01', DATE '2026-10-01', 20000, 3800, 23800, 'aceptado', 'Servicio ficticio vencido para pruebas visuales', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;
