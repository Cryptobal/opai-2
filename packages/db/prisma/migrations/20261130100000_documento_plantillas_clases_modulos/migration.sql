-- CAR-315 parte 2 · Plantillas de Documentos para otros módulos (decisión de Carlos del 11-nov-2026,
-- ADR-097: Documentos es el único lugar de las plantillas). ADITIVA: amplía el CHECK de `clase` con
-- `contrato_servicio` (se genera sobre una cuenta) y `acta` (sobre una instalación). No toca filas.
-- Sin UPDATE/DELETE: el aviso de REGLAS-codigo sobre filas afectadas con FORCE RLS no aplica.
--
-- Reversión (manual; solo si no hay plantillas de esas clases):
--   ALTER TABLE "core"."documento_plantillas" DROP CONSTRAINT "documento_plantillas_clase_check";
--   ALTER TABLE "core"."documento_plantillas" ADD CONSTRAINT "documento_plantillas_clase_check"
--     CHECK ("clase" IN ('contrato_trabajo', 'anexo_contrato', 'recepcion_laboral', 'carta_trabajador'));
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."documento_plantillas" DROP CONSTRAINT IF EXISTS "documento_plantillas_clase_check";
ALTER TABLE "core"."documento_plantillas" ADD CONSTRAINT "documento_plantillas_clase_check"
  CHECK ("clase" IN (
    'contrato_trabajo', 'anexo_contrato', 'recepcion_laboral', 'carta_trabajador',
    'contrato_servicio', 'acta'
  ));

COMMIT;
