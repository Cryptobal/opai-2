-- Brief 07d · PR 1 (revisión 5659458420, bloqueante 1): guardar el texto exacto del DPA aceptado.
-- Hasta ahora el texto vivía solo en el ajuste de plataforma `cumplimiento_dpa_texto`, que es
-- MUTABLE: si OPAI editaba ese texto, el hash de `documento_ref` dejaba de calzar con algo
-- recuperable y no quedaba prueba del texto aceptado. Se agrega `documento_texto` a la tabla
-- append-only `dpa_aceptaciones` (la migración 20261027000000 ya revocó UPDATE/DELETE a opai_app
-- sobre ella), de modo que el texto queda recuperable e inmutable por fila. La aceptación lee
-- versión y texto y escribe la fila en la misma transacción (sin TOCTOU).
-- Migración aditiva e idempotente (IF NOT EXISTS). Timestamp posterior a 20261027000000.
ALTER TABLE "core"."dpa_aceptaciones" ADD COLUMN IF NOT EXISTS "documento_texto" TEXT;
