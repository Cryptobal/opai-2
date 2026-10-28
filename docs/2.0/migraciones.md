# Migraciones seguras — OPAI 2.0

Regla de forma de toda migración nueva de `packages/db/prisma/migrations/` (CAR-47, auditoría del Núcleo §I-08). Complementa, sin repetirlas, las reglas de RLS y de migraciones de datos de `REGLAS-codigo.md` y el procedimiento de aplicación con respaldo de `OPERACION-agentes.md` A.5.

## Plantilla

Se parte de [`packages/db/prisma/plantilla-migracion.sql`](../../packages/db/prisma/plantilla-migracion.sql):

```sql
-- Qué hace y por qué: …
BEGIN;
SET LOCAL lock_timeout = '5s';

-- … cambios aditivos …

COMMIT;

-- Reversión: … (SQL que deshace cada cambio, o por qué no aplica y cómo se restaura desde el snapshot)
```

1. **Una sola transacción.** La primera sentencia es `BEGIN`, la última `COMMIT`, sin otras en medio. Prisma no envuelve `migration.sql` en una transacción: si no se abre una, un fallo deja la migración a medias.
2. **`SET LOCAL lock_timeout` como segunda sentencia.** Si la migración no consigue un lock en ese plazo, falla y se revierte entera en vez de dejar a la app esperando detrás de ella. `SET LOCAL` rige solo dentro de la transacción; un `SET` de sesión (como el de `20261028200000_anexo_contrato_borrador`) sigue vigente en la conexión después de la migración y fuera de cualquier transacción, y se rechaza.
3. **Sección `-- Reversión:` obligatoria**, con contenido: el SQL que deshace la migración, o por qué no se puede y cómo se vuelve atrás (snapshot de Neon previo, A.5).
4. **Sin transacción, solo con marca.** Lo que Postgres no admite en transacción (`CREATE INDEX CONCURRENTLY`) lleva una línea `-- opai:sin-transaccion: <motivo>` (al menos 10 caracteres), un `SET lock_timeout = '…'` de sesión y ningún `BEGIN`/`COMMIT`. La reversión sigue siendo obligatoria.

Los topes del rol `opai_app` (`lock_timeout` 5 s, `statement_timeout` 20 s, `idle_in_transaction_session_timeout` 30 s) y el `lock_timeout` de 3 s de `core.auditoria_append` ya están en `main` desde la migración `20261028220000_timeouts_opai_app` (PR #102). La plantilla cubre el otro lado: la migración que espera locks de la app.

## Cómo se verifica

`packages/db/test/migraciones-plantilla.test.ts` corre en `pnpm test` (check `typecheck · lint · test · test:db`) y falla si una migración con fecha **posterior a `20261028230000`** no cumple los puntos 1 a 4.

Las migraciones hasta ese corte ya están aplicadas en Neon y **no se editan**; quedan exentas, listadas una por una en `packages/db/test/migraciones-reglas.ts` (`EXENTAS`). La última de la lista es la del PR #109, abierto al fijar el corte. Una migración con fecha ≤ corte que no esté en la lista también hace fallar el test: el corte no se esquiva con una fecha retroactiva.
