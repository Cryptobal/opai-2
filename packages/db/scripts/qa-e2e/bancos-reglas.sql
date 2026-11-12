-- Siembra de la empresa ficticia `qa-e2e` para las pruebas visuales de Bancos y reglas (CAR-328).
-- Una cuenta bancaria inventada, dos filas del flujo, una cuenta contable y cuatro movimientos ficticios
-- (dos cargos sin reconocer, un abono sin reconocer y un cargo conciliado), para ver el filtro por tipo,
-- «Reconocer» contra una fila del flujo y la pestaña Reglas sin tocar a Gard ni datos reales.
--
-- Dónde se corre: en la rama `main` de Neon (test.opai.cl), de la que nacen las ramas de vista previa. Solo toca `qa-e2e`.
-- Idempotente (IDs fijos, ON CONFLICT DO NOTHING); no hace nada si la empresa no existe. Cada sentencia por separado.

INSERT INTO finanzas.flujo_filas (id, tenant_id, seccion, etiqueta, arrastre, orden, activa, updated_at)
SELECT '00000000-0000-7000-8000-000000328001'::uuid, t.id, 'egreso', 'Sistemas (QA)', false, 10, true, now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.flujo_filas (id, tenant_id, seccion, etiqueta, arrastre, orden, activa, updated_at)
SELECT '00000000-0000-7000-8000-000000328002'::uuid, t.id, 'ingreso', 'Otros ingresos (QA)', false, 10, true, now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.cuentas_contables (id, tenant_id, codigo, nombre, tipo, naturaleza, updated_at)
SELECT '00000000-0000-7000-8000-000000328003'::uuid, t.id, '6.1.99', 'Gastos de sistemas (QA)', 'gasto', 'deudora', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.cuentas_bancarias (id, tenant_id, banco, numero_visible, updated_at)
SELECT '00000000-0000-7000-8000-000000328004'::uuid, t.id, 'Banco Ficticio QA', '000328', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.movimientos_bancarios (id, tenant_id, cuenta_id, fecha, monto, glosa, referencia, clave_dedupe, estado, origen, updated_at)
SELECT v.id::uuid, t.id, '00000000-0000-7000-8000-000000328004'::uuid, v.fecha::date, v.monto, v.glosa, v.ref, v.clave, v.estado, 'cartola', now()
FROM core.tenants t,
  (VALUES
    ('00000000-0000-7000-8000-000000328011', '2026-11-10', -20174, 'Compra SERVICIO FICTICIO QA', NULL, 'qa328-1', 'pendiente'),
    ('00000000-0000-7000-8000-000000328012', '2026-11-10', -45000, 'Comision ficticia QA', 'C-1', 'qa328-2', 'pendiente'),
    ('00000000-0000-7000-8000-000000328013', '2026-11-11', 150000, 'Abono cliente ficticio QA', 'A-1', 'qa328-3', 'pendiente'),
    ('00000000-0000-7000-8000-000000328014', '2026-11-09', -9900, 'Compra SERVICIO FICTICIO QA', NULL, 'qa328-4', 'conciliado')
  ) AS v(id, fecha, monto, glosa, ref, clave, estado)
WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.conciliaciones (id, tenant_id, movimiento_id, tipo_enlace, enlace_id, monto, activa, propuesta, confirmada)
SELECT '00000000-0000-7000-8000-000000328021'::uuid, t.id, '00000000-0000-7000-8000-000000328014'::uuid, 'flujo_fila',
       '00000000-0000-7000-8000-000000328001'::uuid, 9900, true, false, true
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

-- Reversión (solo qa-e2e): borrar por estos IDs fijos en orden inverso (conciliación, movimientos, cuenta, plan, filas).
