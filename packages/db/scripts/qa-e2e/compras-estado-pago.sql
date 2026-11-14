-- Siembra de la empresa ficticia `qa-e2e` para la prueba visual del estado de pago de las compras (CAR-239).
-- Un proveedor inventado y dos facturas recibidas: una por pagar con el plazo vencido y otra pagada por una
-- conciliación con un movimiento ficticio de la cuenta «Banco Ficticio QA» de `bancos-reglas.sql` (correr ese archivo antes).
--
-- Dónde se corre: en la rama `main` de Neon (test.opai.cl), de la que nacen las ramas de vista previa. Solo toca `qa-e2e`.
-- Idempotente (IDs fijos, ON CONFLICT DO NOTHING); no hace nada si la empresa no existe. Nunca Gard ni datos reales.
-- Los folios 990101 y 990102 son inventados. Cada sentencia se corre por separado con el rol propietario.

INSERT INTO finanzas.proveedores (id, tenant_id, rut, razon_social, plazo_pago_dias, updated_at)
SELECT '00000000-0000-7000-8000-000000239001'::uuid, t.id, '76999239-5', 'Proveedor ficticio QA E2E', 30, now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.documentos_recibidos
  (id, tenant_id, proveedor_id, tipo_dte, folio, fecha_emision, fecha_recepcion, monto_neto, monto_iva, monto_total, glosa, updated_at)
SELECT v.id::uuid, t.id, '00000000-0000-7000-8000-000000239001'::uuid, 33, v.folio, v.emision::date, v.emision::date,
       10000, 1900, 11900, 'Compra ficticia para pruebas visuales', now()
FROM core.tenants t,
  (VALUES
    ('00000000-0000-7000-8000-000000239011', 990101, '2026-09-01'),
    ('00000000-0000-7000-8000-000000239012', 990102, '2026-09-02')
  ) AS v(id, folio, emision)
WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.movimientos_bancarios (id, tenant_id, cuenta_id, fecha, monto, glosa, referencia, clave_dedupe, estado, origen, updated_at)
SELECT '00000000-0000-7000-8000-000000239021'::uuid, t.id, '00000000-0000-7000-8000-000000328004'::uuid, DATE '2026-09-20',
       -11900, 'Pago proveedor ficticio QA (compra)', NULL, 'qa239-1', 'conciliado', 'cartola', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.conciliaciones (id, tenant_id, movimiento_id, tipo_enlace, enlace_id, monto, activa, propuesta, confirmada)
SELECT '00000000-0000-7000-8000-000000239031'::uuid, t.id, '00000000-0000-7000-8000-000000239021'::uuid, 'documento_recibido',
       '00000000-0000-7000-8000-000000239012'::uuid, 11900, true, false, true
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

-- Reversión (solo qa-e2e): borrar por estos IDs fijos en orden inverso (conciliación, movimiento, documentos, proveedor).
