-- Siembra de la empresa ficticia `qa-e2e` para la prueba visual de los sobrantes del banco en línea (CAR-450).
-- Un movimiento inventado que llegó «por el banco en línea» en octubre y que la cartola ficticia de octubre de la
-- prueba de cuadratura no trae: la vista previa de «Subir cartola» lo muestra como sobrante. La prueba solo abre la
-- vista previa: no importa ni borra nada.
--
-- Dónde se corre: en la rama `main` de Neon (test.opai.cl), después de `bancos-reglas.sql` (crea la cuenta).
-- Solo toca `qa-e2e`. Idempotente (ID fijo, ON CONFLICT DO NOTHING); no hace nada si la empresa no existe.

INSERT INTO finanzas.movimientos_bancarios (id, tenant_id, cuenta_id, fecha, monto, glosa, clave_dedupe, id_externo, estado, origen, updated_at)
SELECT '00000000-0000-7000-8000-000000450001'::uuid, t.id, '00000000-0000-7000-8000-000000328004'::uuid,
       '2026-10-15', -7777, 'TEF ficticia QA en línea sin par en la cartola', 'qa450-sobrante', 'qa450-w4l-1', 'pendiente', 'web4leads', now()
FROM core.tenants t WHERE t.slug = 'qa-e2e'
ON CONFLICT (id) DO NOTHING;

-- Reversión (solo qa-e2e): borrar el movimiento por este ID fijo.
