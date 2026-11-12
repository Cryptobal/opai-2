-- Finanzas · CAR-320 (ADR-100, regla de Carlos del 12-nov-2026): un documento puede tener varios destinatarios
-- principales (PARA), hasta 10, como en OPAI 1. Se quita el índice único parcial que limitaba a un solo PARA.
-- Solo relaja una restricción: no cambia ni borra datos; el tope de 10 lo valida el dominio al guardar.
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS "finanzas"."documentos_emitidos_destinatarios_un_para_key";

COMMIT;

-- Reversión: CREATE UNIQUE INDEX "documentos_emitidos_destinatarios_un_para_key" ON
-- "finanzas"."documentos_emitidos_destinatarios"("documento_id") WHERE "tipo" = 'PARA';
-- (solo si ningún documento quedó con más de un PARA; si no, primero dejar uno solo por documento).
