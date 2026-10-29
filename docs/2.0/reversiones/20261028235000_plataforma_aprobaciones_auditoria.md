# Reversión · `20261028235000_plataforma_aprobaciones_auditoria` (CAR-36, PR #109)

Runbook de la reversión de la migración que sacó las aprobaciones y la auditoría `platform.*` de las empresas. **Reemplaza al bloque `-- Reversión` del final de su `migration.sql`**, que queda como está porque la migración ya está aplicada en Neon y editarla cambiaría su checksum en `_prisma_migrations`. Pendiente no bloqueante de la revisión 5693621014 del «Revisor OPAI 2.0» (ADR-054).

## Antes de empezar: la reversión es parcial

El SQL de abajo **no deja la base como estaba antes de la migración**. Lo que la migración borró o desligó no se puede reconstruir desde la base:

- **Eventos** `core.aprobacion.pendiente` y `core.aprobacion.resuelta` de las aprobaciones `platform.*` movidas (tabla `core.eventos`), con sus **entregas** (`core.eventos_entregas`) y sus **notificaciones** (`core.notificaciones`): se borraron.
- **Envíos** (`core.envios`) de esos eventos: se conservan, pero con `evento_id` en NULL. El vínculo con el evento no se repone.
- **Auditoría**: las filas `platform.*` de `core.audit_events` anteriores a la migración siguen ahí (solo se copiaron). Lo auditado **después** de la migración vive solo en `core.auditoria_global` y se pierde al borrarla si no se exporta antes (paso 1).
- **Aprobaciones sin empresa de origen** (`origen_tenant_id` NULL: pedidos hechos sin empresa elegida, posibles solo después de la migración) no tienen dónde volver, porque `core.aprobaciones.tenant_id` es obligatorio. Lo mismo vale si la empresa de origen ya no existe, si la fila no trae exactamente una identidad de agente (key o agente interno) o si su key ya se borró: `core.aprobaciones` exige las tres cosas y la cola nueva no.

**La recuperación completa se hace desde el snapshot (o la rama de respaldo) de Neon tomado antes de aplicar la migración** (`OPERACION-agentes.md` A.5), no con este script. El script sirve solo cuando volver al snapshot no es aceptable (por ejemplo, porque descartaría escrituras de negocio posteriores) y se acepta perder lo listado arriba.

La reversión de la base va siempre junto con la reversión del código del PR #109: con el código actual, la app escribe y lee la cola y la auditoría nuevas.

## Pasos

1. **Snapshot y exportación.** Tomar un snapshot de la rama de Neon y exportar las dos tablas nuevas (rol propietario):

   ```bash
   psql "$DATABASE_URL_MIGRATE" -c "\copy core.aprobaciones_plataforma TO 'aprobaciones_plataforma.csv' CSV HEADER"
   ```

   ```bash
   psql "$DATABASE_URL_MIGRATE" -c "\copy core.auditoria_global TO 'auditoria_global.csv' CSV HEADER"
   ```

   Los CSV pueden traer datos de varias empresas: se guardan en el almacén de respaldos, nunca en el repositorio, un PR o una tarea (Ley 21.719).

2. **Revisar las filas que no vuelven** (con el rol propietario; si no tiene BYPASSRLS, `core.api_keys` con FORCE se ve vacía y todas las filas con key salen como «no vuelven»: correr este conteo dentro de la transacción del paso 3, después de su `NO FORCE`, o con un rol con BYPASSRLS):

   ```sql
   SELECT count(*) FROM core.aprobaciones_plataforma p
   WHERE NOT (
     EXISTS (SELECT 1 FROM core.tenants t WHERE t.id = p.origen_tenant_id)
     AND (p.api_key_id IS NOT NULL) <> (p.agente_interno_id IS NOT NULL)
     AND (p.api_key_id IS NULL OR EXISTS (SELECT 1 FROM core.api_keys k
       WHERE k.id = p.api_key_id AND k.tenant_id = p.origen_tenant_id))
   );
   ```

   Una fila vuelve solo si cumple las tres condiciones que `core.aprobaciones` exige y la cola nueva no: empresa de origen existente (`tenant_id` es obligatorio; `origen_tenant_id` NULL no pasa), exactamente una identidad de agente (CHECK `aprobaciones_identidad_agente`: key o agente interno) y, si trae key, que la key siga existiendo en esa empresa (trigger `mismo_tenant`; la cola nueva guarda «Key eliminada» cuando ya no está). Si el resultado es mayor que 0, esas filas solo quedan en el CSV del paso 1. El script falla cerrado salvo que se confirme el descarte en la misma transacción (`SET LOCAL car36.descartar_sin_origen = 'si'`).

3. **Reversión**, con el rol propietario y en una sola transacción:

   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '5s';
   -- Solo si el paso 2 dio más de 0 y se aceptó perder esas filas (quedan en el CSV):
   -- SET LOCAL car36.descartar_sin_origen = 'si';
   ALTER TABLE core.aprobaciones NO FORCE ROW LEVEL SECURITY;
   -- El trigger mismo_tenant (SECURITY DEFINER) y la selección leen las keys de cada empresa.
   ALTER TABLE core.api_keys NO FORCE ROW LEVEL SECURITY;
   DO $$
   DECLARE
     v_total integer;
     v_devolvibles integer;
     v_devueltas integer;
   BEGIN
     SELECT count(*) INTO v_total FROM core.aprobaciones_plataforma;
     CREATE TEMP TABLE car36_devolver ON COMMIT DROP AS
       SELECT p.* FROM core.aprobaciones_plataforma p
       WHERE EXISTS (SELECT 1 FROM core.tenants t WHERE t.id = p.origen_tenant_id)
         AND (p.api_key_id IS NOT NULL) <> (p.agente_interno_id IS NOT NULL)
         AND (p.api_key_id IS NULL OR EXISTS (SELECT 1 FROM core.api_keys k
           WHERE k.id = p.api_key_id AND k.tenant_id = p.origen_tenant_id));
     SELECT count(*) INTO v_devolvibles FROM car36_devolver;
     IF v_devolvibles < v_total
        AND coalesce(current_setting('car36.descartar_sin_origen', true), '') <> 'si' THEN
       RAISE EXCEPTION 'CAR-36: % aprobaciones no se pueden devolver (sin empresa de origen, sin identidad de agente o con la key borrada); exportarlas y confirmar el descarte',
         v_total - v_devolvibles;
     END IF;
     INSERT INTO core.aprobaciones (id, tenant_id, api_key_id, agente_interno_id, via_user_id,
       capability, input, idempotency_key, resumen, estado, vence_en, resuelta_por, resuelta_en,
       motivo, resultado, created_at, updated_at)
     SELECT id, origen_tenant_id, api_key_id, agente_interno_id, via_user_id, capability, input,
       idempotency_key, resumen, estado, vence_en, resuelta_por, resuelta_en, motivo, resultado,
       created_at, updated_at
     FROM car36_devolver;
     GET DIAGNOSTICS v_devueltas = ROW_COUNT;
     IF v_devueltas <> v_devolvibles THEN
       RAISE EXCEPTION 'CAR-36: esperadas %, devueltas %', v_devolvibles, v_devueltas;
     END IF;
     RAISE NOTICE 'CAR-36: % aprobaciones devueltas, % descartadas',
       v_devueltas, v_total - v_devueltas;
   END
   $$;
   ALTER TABLE core.aprobaciones FORCE ROW LEVEL SECURITY;
   ALTER TABLE core.api_keys FORCE ROW LEVEL SECURITY;
   DROP FUNCTION core.auditoria_global_append(uuid, text, text, text, text, text, uuid, uuid, text, text, jsonb, jsonb, jsonb, text, text, timestamptz, uuid);
   DROP TABLE core.auditoria_global;
   DROP TABLE core.aprobaciones_plataforma;
   DELETE FROM _prisma_migrations WHERE migration_name = '20261028235000_plataforma_aprobaciones_auditoria';
   COMMIT;
   ```

   Diferencias con el bloque del `migration.sql`: `SET LOCAL lock_timeout`; el fallo cerrado ante las filas que no pueden volver (el bloque viejo omitía en silencio las de `origen_tenant_id` NULL, y una fila sin identidad de agente o con la key borrada hacía fallar el `INSERT` entero); `NO FORCE` también en `core.api_keys`, y la verificación del conteo devuelto. `NO FORCE` vale solo dentro de la transacción: si el rol que revierte no tiene BYPASSRLS, con FORCE el `INSERT` en `core.aprobaciones` fallaría por `WITH CHECK` (no hay `app.tenant_id`) y el trigger `mismo_tenant` no vería ninguna key.

4. **Verificar:** `core.aprobaciones_plataforma` y `core.auditoria_global` ya no existen, `core.aprobaciones` y `core.api_keys` tienen otra vez `relforcerowsecurity = true` y las aprobaciones `platform.*` devueltas están en su empresa de origen. Avisar a Carlos en español con los conteos del `NOTICE`.

## Probado

El script se probó el 29-oct-2026 en una base desechable (Postgres 16, superusuario local, así que no ejercita el caso sin BYPASSRLS) con las migraciones hasta `20261028235000` y cuatro aprobaciones: una válida, una sin empresa de origen, una sin key ni agente interno y una con la key borrada. Sin confirmar, falla cerrado y no cambia nada; con `car36.descartar_sin_origen = 'si'` devuelve la válida a su empresa, descarta las otras tres, borra las tablas, la función y la fila de `_prisma_migrations`, y deja FORCE puesto en `core.aprobaciones` y `core.api_keys`.
