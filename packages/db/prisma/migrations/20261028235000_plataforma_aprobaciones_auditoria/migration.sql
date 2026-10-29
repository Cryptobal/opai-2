-- CAR-36 · Aprobaciones y auditoría de plataforma fuera de los tenants (auditoría del Núcleo B-01),
-- con la auditoría global de CAR-41 (antes/después de los cambios globales) y la tabla preparada
-- para el registro de seguridad de CAR-42 (ámbito `seguridad`, IP cifrada; sin escritor aún).
-- Antes, un agente con key de scope `platform` dejaba sus pedidos `platform.*` (y su auditoría) en
-- la empresa de la key: los owners y admins de esa empresa veían ids de otras empresas, correos,
-- slugs y nombres sin tener `platformRole`.
--
-- 1) Dos tablas sin `tenant_id` (y por eso sin RLS, como `core.users`/`core.tenants`):
--    `core.aprobaciones_plataforma` (cola) y `core.auditoria_global` (append-only, una cadena por
--    ámbito: `plataforma` y `seguridad`). La app solo las toca por operaciones con nombre.
-- 2) `core.auditoria_global_append`: append atómico por ámbito, el mismo esquema de hash que
--    `core.auditoria_append` (sha256(anterior + "\n" + canon), canon con el digest del contenido
--    —payload, antes, después, IP cifrada y user agent—, no el contenido).
-- 3) Mueve las aprobaciones `platform.*` existentes de `core.aprobaciones` a la cola nueva y COPIA
--    la auditoría `platform.*` existente a la cadena `plataforma`. Las filas de `core.audit_events` NO se
--    borran: esa tabla es inmutable y encadenada por tenant (borrar rompería la verificación); la
--    app deja de mostrarlas a las empresas (`core.audit.list` y la actividad las filtran).
--
-- FORCE RLS (20261028170000): si el rol que migra no tiene BYPASSRLS, un SELECT/DELETE sobre
-- `core.aprobaciones` o `core.audit_events` sin `app.tenant_id` ve 0 filas EN SILENCIO. Por eso el
-- movimiento quita FORCE a esas dos tablas (a `core.api_keys`, que solo lee, y a `core.eventos`,
-- `core.eventos_entregas`, `core.notificaciones` y `core.envios`, de las que borra o desliga los
-- restos) solo dentro de esta
-- transacción (el dueño de la tabla sin FORCE no queda sujeto a RLS), mueve con verificación de
-- conteos y vuelve a poner FORCE antes
-- del COMMIT. Nadie más ve el estado intermedio: ALTER TABLE toma ACCESS EXCLUSIVE hasta el final.
--
-- Reintentos (revisión del PR #109, bloqueante "corre después del #113"): este script es
-- idempotente a propósito. La causa real del P3009 en `preview/pr-109` no fue el orden con el
-- #113 ni las FK RESTRICT (esas ya se manejan arriba): esta migración vivió un tiempo con el
-- nombre de carpeta `20261028230000_…`, y en ese momento `preview/pr-109` (rama Neon reutilizada
-- entre pushes, no recreada) ya la había aplicado con éxito con un contenido más viejo (sin la
-- columna `agente_interno_id`, sin la limpieza de `eventos`/`notificaciones`/`envios`). Al
-- renombrar la carpeta a `20261028235000_…` (después de agregar el #113, 20261028234500), Prisma
-- la trató como una migración nueva y volvió a correr el `CREATE TABLE` contra una base que ya
-- tenía esa tabla: el error real («relation "aprobaciones_plataforma" already exists») nunca
-- aparece en el log de `prisma migrate deploy`, que solo imprime el "current transaction is
-- aborted" de los statements siguientes. `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT
-- EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` y el filtro `NOT EXISTS` en
-- la copia de auditoría hacen que una corrida parcial previa (bajo cualquier nombre) no choque ni
-- duplique datos. Esto no sustituye limpiar la rama `preview/pr-109` ya atascada (con el intento
-- fallido registrado en Neon, P3009): el bot «OPAI 2.0» la recrea (`docs/2.0/ESTADO.md`).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateTable (IF NOT EXISTS/ADD COLUMN IF NOT EXISTS: idempotente si una corrida previa de esta
-- misma migración, bajo otro nombre de carpeta, ya la aplicó parcialmente en una rama Neon de
-- preview reutilizada — ver nota de "Reintentos" más abajo).
CREATE TABLE IF NOT EXISTS "core"."aprobaciones_plataforma" (
    "id" UUID NOT NULL,
    "origen_tenant_id" UUID,
    "api_key_id" UUID,
    "agente" TEXT NOT NULL,
    "agente_interno_id" TEXT,
    "via_user_id" UUID NOT NULL,
    "capability" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "resumen" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "resuelta_por" UUID,
    "resuelta_en" TIMESTAMPTZ(6),
    "motivo" TEXT,
    "resultado" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aprobaciones_plataforma_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "aprobaciones_plataforma_capability_check" CHECK ("capability" LIKE 'platform.%')
);
-- Columna agregada después de la primera versión de esta migración (agente_interno_id): si la
-- tabla ya existía sin ella (reintento, ver nota de "Reintentos"), se agrega ahora.
ALTER TABLE "core"."aprobaciones_plataforma" ADD COLUMN IF NOT EXISTS "agente_interno_id" TEXT;
CREATE INDEX IF NOT EXISTS "aprobaciones_plataforma_estado_created_at_idx"
  ON "core"."aprobaciones_plataforma"("estado", "created_at");
CREATE INDEX IF NOT EXISTS "aprobaciones_plataforma_api_key_id_capability_idempotency_key_idx"
  ON "core"."aprobaciones_plataforma"("api_key_id", "capability", "idempotency_key");

-- CreateTable (IF NOT EXISTS: ver nota de "Reintentos" más abajo).
CREATE TABLE IF NOT EXISTS "core"."auditoria_global" (
    "id" UUID NOT NULL,
    "ambito" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "via_user_id" TEXT,
    "capability" TEXT NOT NULL,
    "tenant_objetivo_id" UUID,
    "origen_tenant_id" UUID,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "payload" JSONB,
    "antes" JSONB,
    "despues" JSONB,
    "ip_cifrada" TEXT,
    "user_agent" TEXT,
    "origen_evento_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash_anterior" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "hash_canon" TEXT NOT NULL,

    CONSTRAINT "auditoria_global_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auditoria_global_ambito_check" CHECK ("ambito" IN ('plataforma', 'seguridad'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "auditoria_global_ambito_seq_key" ON "core"."auditoria_global"("ambito", "seq");
CREATE INDEX IF NOT EXISTS "auditoria_global_ambito_tenant_objetivo_id_seq_idx"
  ON "core"."auditoria_global"("ambito", "tenant_objetivo_id", "seq");
CREATE INDEX IF NOT EXISTS "auditoria_global_ambito_capability_seq_idx"
  ON "core"."auditoria_global"("ambito", "capability", "seq");
CREATE INDEX IF NOT EXISTS "auditoria_global_ambito_actor_id_seq_idx"
  ON "core"."auditoria_global"("ambito", "actor_id", "seq");

-- Permisos de opai_app: la cola se lee, crea y resuelve (nunca se borra); la auditoría solo se
-- lee y se agrega (los ALTER DEFAULT PRIVILEGES del schema core darían también UPDATE/DELETE).
REVOKE ALL ON "core"."aprobaciones_plataforma", "core"."auditoria_global" FROM opai_app;
GRANT SELECT, INSERT, UPDATE ON "core"."aprobaciones_plataforma" TO opai_app;
GRANT SELECT, INSERT ON "core"."auditoria_global" TO opai_app;

-- Append encadenado por ámbito. SECURITY INVOKER y con la misma espera máxima del lock que
-- core.auditoria_append desde 20261028220000_timeouts_opai_app (3 s; vencido, falla con 55P03 y la
-- transacción del llamador hace ROLLBACK).
CREATE OR REPLACE FUNCTION core.auditoria_global_append(
  p_id uuid, p_ambito text, p_actor text, p_actor_id text, p_via_user text, p_capability text,
  p_tenant_objetivo uuid, p_origen_tenant uuid, p_entity_type text, p_entity_id text,
  p_payload jsonb, p_antes jsonb, p_despues jsonb, p_ip_cifrada text, p_user_agent text,
  p_created_at timestamptz, p_origen_evento uuid
) RETURNS TABLE(id uuid, seq integer, hash text)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog, core
  SET lock_timeout = '3s' AS $$
DECLARE
  v_seq integer;
  v_anterior text;
  v_canon text;
  v_hash text;
BEGIN
  -- Clave propia por ámbito (no es un uuid de tenant: no choca con core.auditoria_append).
  PERFORM pg_advisory_xact_lock(hashtextextended('core.auditoria_global:' || p_ambito, 0));
  SELECT a.seq, a.hash INTO v_seq, v_anterior FROM core.auditoria_global a
    WHERE a.ambito = p_ambito ORDER BY a.seq DESC LIMIT 1;
  v_seq := coalesce(v_seq, 0) + 1;
  v_anterior := coalesce(v_anterior, repeat('0', 64));
  v_canon := jsonb_build_array(p_ambito, v_seq, p_actor, p_actor_id, p_via_user, p_capability,
    p_tenant_objetivo::text, p_origen_tenant::text, p_entity_type, p_entity_id,
    to_char(p_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    encode(sha256(convert_to(jsonb_build_array(p_payload, p_antes, p_despues, p_ip_cifrada,
      p_user_agent)::text, 'UTF8')), 'hex'))::text;
  v_hash := encode(sha256(convert_to(v_anterior || E'\n' || v_canon, 'UTF8')), 'hex');
  INSERT INTO core.auditoria_global(id, ambito, seq, actor_type, actor_id, via_user_id,
    capability, tenant_objetivo_id, origen_tenant_id, entity_type, entity_id, payload, antes,
    despues, ip_cifrada, user_agent, origen_evento_id, created_at, hash_anterior, hash, hash_canon)
    VALUES(p_id, p_ambito, v_seq, p_actor, p_actor_id, p_via_user, p_capability,
      p_tenant_objetivo, p_origen_tenant, p_entity_type, p_entity_id, p_payload, p_antes,
      p_despues, p_ip_cifrada, p_user_agent, p_origen_evento, p_created_at, v_anterior, v_hash,
      v_canon);
  RETURN QUERY SELECT p_id, v_seq, v_hash;
END;
$$;
REVOKE ALL ON FUNCTION core.auditoria_global_append(uuid, text, text, text, text, text, uuid, uuid, text, text, jsonb, jsonb, jsonb, text, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.auditoria_global_append(uuid, text, text, text, text, text, uuid, uuid, text, text, jsonb, jsonb, jsonb, text, text, timestamptz, uuid) TO opai_app;

-- Movimiento de los datos existentes (ver encabezado: FORCE solo se quita dentro de esta tx).
ALTER TABLE "core"."aprobaciones" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."audit_events" NO FORCE ROW LEVEL SECURITY;
-- Solo lectura (el nombre de la key para la cola nueva); sin esto el JOIN vería 0 keys en silencio.
ALTER TABLE "core"."api_keys" NO FORCE ROW LEVEL SECURITY;
-- Restos en la empresa de la key (revisión del PR #109): los eventos `core.aprobacion.*` de las
-- aprobaciones movidas (su payload trae el resumen, con datos de la empresa objetivo) y las
-- notificaciones y entregas que generaron se borran. `core.envios` no guarda contenido (solo
-- destinatario y estado) y se conserva como registro de envío, desligado del evento
-- (`evento_id` NULL): así no choca con una FK RESTRICT `envios_evento_id_fkey` (#113, CAR-45/46),
-- se aplique esa migración antes o después que esta.
ALTER TABLE "core"."eventos" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."eventos_entregas" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."notificaciones" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."envios" NO FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_esperadas integer;
  v_copiadas integer;
  v_borradas integer;
  v_eventos integer;
  v_restos integer;
  v_avisos integer;
  v_envios integer;
  v_fila record;
BEGIN
  -- Los ALTER TABLE de arriba exigen ser dueño de la tabla: sin FORCE, el dueño no queda sujeto
  -- a RLS y ve todas las filas. Igual se verifican los conteos (falla cerrado).
  SELECT count(*) INTO v_esperadas FROM core.aprobaciones WHERE capability LIKE 'platform.%';
  INSERT INTO core.aprobaciones_plataforma (id, origen_tenant_id, api_key_id, agente,
    agente_interno_id, via_user_id, capability, input, idempotency_key, resumen, estado, vence_en, resuelta_por,
    resuelta_en, motivo, resultado, created_at, updated_at)
  SELECT a.id, a.tenant_id, a.api_key_id,
    CASE WHEN a.agente_interno_id IS NOT NULL THEN 'Agente interno'
      ELSE coalesce(k.nombre, 'Key eliminada') END,
    a.agente_interno_id, a.via_user_id, a.capability, a.input, a.idempotency_key, a.resumen, a.estado, a.vence_en,
    a.resuelta_por, a.resuelta_en, a.motivo, a.resultado, a.created_at, a.updated_at
  FROM core.aprobaciones a LEFT JOIN core.api_keys k ON k.id = a.api_key_id
  WHERE a.capability LIKE 'platform.%';
  GET DIAGNOSTICS v_copiadas = ROW_COUNT;
  -- Avisos y eventos de esas aprobaciones en la empresa de la key (antes de borrar las filas).
  -- Primero se desligan o borran todas las filas que apuntan a esos eventos (por `evento_id`,
  -- sin mirar su tenant), para que ninguna FK, CASCADE o RESTRICT, frene el borrado. El id también
  -- se busca en `aprobaciones_plataforma` (no solo en `aprobaciones`): en un reintento (ver nota de
  -- "Reintentos" más abajo) la aprobación ya se movió, pero sus restos pueden seguir sin limpiar.
  CREATE TEMP TABLE car36_eventos ON COMMIT DROP AS
    SELECT e.id FROM core.eventos e
    WHERE e.tipo IN ('core.aprobacion.pendiente', 'core.aprobacion.resuelta')
      AND e.entidad_tipo = 'aprobacion'
      AND e.entidad_id IN (
        SELECT id::text FROM core.aprobaciones WHERE capability LIKE 'platform.%'
        UNION
        SELECT id::text FROM core.aprobaciones_plataforma
      );
  UPDATE core.envios SET evento_id = NULL WHERE evento_id IN (SELECT id FROM car36_eventos);
  GET DIAGNOSTICS v_envios = ROW_COUNT;
  DELETE FROM core.notificaciones WHERE evento_id IN (SELECT id FROM car36_eventos);
  GET DIAGNOSTICS v_avisos = ROW_COUNT;
  DELETE FROM core.eventos_entregas WHERE evento_id IN (SELECT id FROM car36_eventos);
  DELETE FROM core.eventos WHERE id IN (SELECT id FROM car36_eventos);
  GET DIAGNOSTICS v_restos = ROW_COUNT;
  DELETE FROM core.aprobaciones WHERE capability LIKE 'platform.%';
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  IF v_copiadas <> v_esperadas OR v_borradas <> v_esperadas THEN
    RAISE EXCEPTION 'CAR-36: aprobaciones esperadas %, copiadas %, borradas %',
      v_esperadas, v_copiadas, v_borradas;
  END IF;

  -- Copia (no movimiento) de la auditoría platform.*, en orden de creación, a la cadena nueva.
  -- `NOT EXISTS (… origen_evento_id)` salta lo ya copiado en un reintento (ver nota de
  -- "Reintentos" más abajo): sin esto, repetir la migración duplicaría cada evento en la cadena.
  SELECT count(*) INTO v_esperadas FROM core.audit_events a WHERE a.capability LIKE 'platform.%'
    AND NOT EXISTS (SELECT 1 FROM core.auditoria_global g WHERE g.origen_evento_id = a.id);
  v_eventos := 0;
  FOR v_fila IN
    SELECT * FROM core.audit_events a WHERE a.capability LIKE 'platform.%'
      AND NOT EXISTS (SELECT 1 FROM core.auditoria_global g WHERE g.origen_evento_id = a.id)
    ORDER BY created_at, id
  LOOP
    PERFORM core.auditoria_global_append(gen_random_uuid(), 'plataforma', v_fila.actor_type,
      v_fila.actor_id, v_fila.via_user_id, v_fila.capability,
      -- Con tenantObjetivo la fila quedó en la empresa objetivo; sin él, en la de origen.
      CASE WHEN v_fila.payload #>> '{input,tenantId}' = v_fila.tenant_id::text
        OR v_fila.capability = 'platform.tenants.create' THEN v_fila.tenant_id END,
      v_fila.tenant_id, v_fila.entity_type, v_fila.entity_id, v_fila.payload, NULL, NULL,
      NULL, NULL, v_fila.created_at, v_fila.id);
    v_eventos := v_eventos + 1;
  END LOOP;
  IF v_eventos <> v_esperadas THEN
    RAISE EXCEPTION 'CAR-36: auditoría esperada %, copiada %', v_esperadas, v_eventos;
  END IF;
  RAISE NOTICE 'CAR-36: % aprobaciones movidas (% eventos y % notificaciones de ellas borrados, % envíos desligados), % eventos de auditoría copiados',
    v_copiadas, v_restos, v_avisos, v_envios, v_eventos;
END
$$;

ALTER TABLE "core"."aprobaciones" FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."audit_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."api_keys" FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."eventos" FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."eventos_entregas" FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."notificaciones" FORCE ROW LEVEL SECURITY;
ALTER TABLE "core"."envios" FORCE ROW LEVEL SECURITY;
COMMIT;

-- Reversión (manual, solo referencia; no la aplica Prisma). Con el rol propietario, en una tx.
-- Devuelve las aprobaciones a su empresa de origen y descarta la auditoría global: las filas
-- copiadas siguen en core.audit_events, pero lo auditado DESPUÉS de esta migración solo está en
-- core.auditoria_global (exportarlo antes si hay que conservarlo).
--
--   BEGIN;
--   ALTER TABLE core.aprobaciones NO FORCE ROW LEVEL SECURITY;
--   INSERT INTO core.aprobaciones (id, tenant_id, api_key_id, agente_interno_id, via_user_id,
--     capability, input, idempotency_key, resumen, estado, vence_en, resuelta_por, resuelta_en,
--     motivo, resultado, created_at, updated_at)
--   SELECT id, origen_tenant_id, api_key_id, agente_interno_id, via_user_id, capability, input,
--     idempotency_key, resumen, estado, vence_en, resuelta_por, resuelta_en, motivo, resultado,
--     created_at, updated_at
--   FROM core.aprobaciones_plataforma WHERE origen_tenant_id IS NOT NULL;
--   ALTER TABLE core.aprobaciones FORCE ROW LEVEL SECURITY;
--   DROP FUNCTION core.auditoria_global_append(uuid, text, text, text, text, text, uuid, uuid, text, text, jsonb, jsonb, jsonb, text, text, timestamptz, uuid);
--   DROP TABLE core.auditoria_global;
--   DROP TABLE core.aprobaciones_plataforma;
--   DELETE FROM _prisma_migrations WHERE migration_name = '20261028235000_plataforma_aprobaciones_auditoria';
--   COMMIT;
