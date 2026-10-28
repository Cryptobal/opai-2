-- Incidente del 28-oct-2026 a las 15:53: una transacción quedó «idle in transaction» con el lock de
-- auditoría del tenant (core.auditoria_append, tras guardar perfil_empresa) y 14 conexiones de
-- opai_app esperaron ese lock (wait_event=advisory) sin tope, hasta agotar el pool. La base tenía
-- statement_timeout y lock_timeout en 0. Sin cambios de datos ni de tablas.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- 1. El lock de auditoría sigue siendo por transacción (pg_advisory_xact_lock dentro de la función)
--    y ahora espera a lo más 3 s: vencido, la función falla con 55P03 (lock_not_available), la
--    transacción del llamador hace ROLLBACK y su conexión vuelve al pool. La cláusula SET de la
--    función rige solo mientras corre y restaura el valor del llamador al salir.
ALTER FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz)
  SET lock_timeout = '3s';

-- 2. Topes por rol para opai_app (rigen en cada conexión nueva, también vía el pooler de Neon):
--    - lock_timeout 5 s: ninguna espera de lock (filas, tablas, advisory) acapara una conexión;
--    - statement_timeout 20 s: ninguna consulta supera la duración útil de una función de Vercel;
--    - idle_in_transaction_session_timeout 30 s: una transacción abandonada (instancia suspendida
--      o request abortado entre el append y el COMMIT) se cierra y suelta sus locks. Es más que el
--      timeout de las transacciones de Prisma (15 s), así que no corta una transacción viva.
-- Sin permiso para ALTER ROLE la migración FALLA entera (una sola transacción, nada queda a medias):
-- estos topes son la defensa del incidente y no deben quedar en 0 en silencio.
ALTER ROLE opai_app SET lock_timeout = '5s';
ALTER ROLE opai_app SET statement_timeout = '20s';
ALTER ROLE opai_app SET idle_in_transaction_session_timeout = '30s';

COMMIT;

-- Reversión: ALTER ROLE opai_app RESET lock_timeout; ALTER ROLE opai_app RESET statement_timeout;
-- ALTER ROLE opai_app RESET idle_in_transaction_session_timeout;
-- ALTER FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) RESET lock_timeout;
