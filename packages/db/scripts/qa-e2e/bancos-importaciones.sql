-- Siembra de la empresa ficticia `qa-e2e` para la prueba visual del historial de importaciones (CAR-341).
-- Una cartola importada inventada, con su período, saldos y autor, y dos movimientos ficticios de octubre en la
-- cuenta «Banco Ficticio QA» de `bancos-reglas.sql` (correr ese archivo antes). La prueba solo abre la vista previa
-- de «Deshacer importación» y cancela: no borra nada.
--
-- Dónde se corre: en la rama `main` de Neon (test.opai.cl). Usa solo columnas anteriores a la migración 20261215100000
-- (las ramas de vista previa nacen de `main` y aplican la migración después). Solo toca `qa-e2e`.
-- Idempotente (IDs fijos, ON CONFLICT DO NOTHING); no hace nada si la empresa no existe. Cada sentencia por separado.

INSERT INTO finanzas.cartolas_importadas (id, tenant_id, cuenta_id, formato, nombre_archivo, fecha_desde, fecha_hasta,
  saldo_final, movimientos_nuevos, duplicados, rechazados, idempotency_key)
SELECT '00000000-0000-7000-8000-000000341001'::uuid, t.id, '00000000-0000-7000-8000-000000328004'::uuid, 'santander',
       'cartola-ficticia-qa-octubre.xlsx', '2026-10-01', '2026-10-31', 1235000, 2, 0, 0, 'qa341-cartola'
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finanzas.movimientos_bancarios (id, tenant_id, cuenta_id, cartola_id, fecha, monto, glosa, referencia, clave_dedupe, estado, origen, updated_at)
SELECT v.id::uuid, t.id, '00000000-0000-7000-8000-000000328004'::uuid, '00000000-0000-7000-8000-000000341001'::uuid,
       v.fecha::date, v.monto, v.glosa, v.ref, v.clave, 'pendiente', 'cartola', now()
FROM core.tenants t,
  (VALUES
    ('00000000-0000-7000-8000-000000341011', '2026-10-30', -15000, 'Pago proveedor ficticio QA (cartola)', '123', 'qa341-1'),
    ('00000000-0000-7000-8000-000000341012', '2026-10-31', 250000, 'Abono ficticio QA (cartola)', '456', 'qa341-2')
  ) AS v(id, fecha, monto, glosa, ref, clave)
WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

-- Reversión (solo qa-e2e): borrar los movimientos y la cartola por estos IDs fijos.
