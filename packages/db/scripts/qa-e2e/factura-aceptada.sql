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
