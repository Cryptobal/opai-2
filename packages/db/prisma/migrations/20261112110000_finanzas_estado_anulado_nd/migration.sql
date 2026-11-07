-- CAR-221 · A2: una nota de crédito anulada por una nota de débito (56) queda en estado `anulado_nd`.
-- Solo AMPLÍA el conjunto permitido (ningún valor existente deja de ser válido): se agrega la restricción nueva como
-- NOT VALID y se valida aparte para no mantener un bloqueo largo; luego se retira la anterior.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."documentos_emitidos"
  ADD CONSTRAINT "documentos_emitidos_estado_dte_chk2"
  CHECK ("estado_dte" = ANY (ARRAY['borrador'::text, 'enviado'::text, 'aceptado'::text, 'rechazado'::text, 'anulado_nc'::text, 'anulado_nd'::text])) NOT VALID;
ALTER TABLE "finanzas"."documentos_emitidos" VALIDATE CONSTRAINT "documentos_emitidos_estado_dte_chk2";
ALTER TABLE "finanzas"."documentos_emitidos" DROP CONSTRAINT "documentos_emitidos_estado_dte_chk";
ALTER TABLE "finanzas"."documentos_emitidos" RENAME CONSTRAINT "documentos_emitidos_estado_dte_chk2" TO "documentos_emitidos_estado_dte_chk";
