-- CAR-341 (seguimiento): historial de importaciones de cartolas y fecha futura de Web4Leads.
-- 1) Quién importó cada cartola, su saldo inicial y saldo final opcional (antes se guardaba 0 cuando la
--    cartola no traía saldo). 2) Relleno de lo anterior desde la auditoría y los movimientos.
-- 3) Movimientos de Web4Leads con fecha posterior al día en que llegaron: se llevan a ese día.
-- Aditiva salvo saldo_final, que pasa a admitir NULL (un 0 sin respaldo no es un saldo).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."cartolas_importadas"
  ADD COLUMN "creado_por_id" UUID,
  ADD COLUMN "creado_por_nombre" TEXT,
  ADD COLUMN "via_agente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "saldo_inicial" BIGINT;
ALTER TABLE "finanzas"."cartolas_importadas" ALTER COLUMN "saldo_final" DROP NOT NULL;

DO $$
DECLARE n integer;
BEGIN
  -- Antes de CAR-341 el saldo final quedaba en 0 cuando la cartola no lo traía: no es un saldo conocido.
  UPDATE "finanzas"."cartolas_importadas" SET "saldo_final" = NULL WHERE "saldo_final" = 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'cartolas sin saldo conocido: %', n;

  -- Período de las cartolas antiguas: primera y última fecha de sus movimientos.
  UPDATE "finanzas"."cartolas_importadas" c
     SET "fecha_desde" = r.desde, "fecha_hasta" = r.hasta
    FROM (SELECT "cartola_id", min("fecha") AS desde, max("fecha") AS hasta
            FROM "finanzas"."movimientos_bancarios" WHERE "cartola_id" IS NOT NULL GROUP BY "cartola_id") r
   WHERE r."cartola_id" = c."id" AND c."fecha_desde" IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'cartolas con período completado: %', n;

  -- Quién importó: el evento de auditoría de la importación más cercano (misma empresa, ±60 s).
  WITH autor AS (
    SELECT c."id",
           (SELECT COALESCE(e."via_user_id", e."actor_id")
              FROM "core"."audit_events" e
             WHERE e."tenant_id" = c."tenant_id" AND e."capability" = 'finanzas.cartolas.importar'
               AND e."created_at" BETWEEN c."created_at" - interval '60 seconds' AND c."created_at" + interval '60 seconds'
               AND COALESCE(e."via_user_id", e."actor_id") ~ '^[0-9a-f-]{36}$'
             ORDER BY abs(extract(epoch FROM e."created_at" - c."created_at"))
             LIMIT 1) AS persona,
           (SELECT e."actor_type" = 'agent'
              FROM "core"."audit_events" e
             WHERE e."tenant_id" = c."tenant_id" AND e."capability" = 'finanzas.cartolas.importar'
               AND e."created_at" BETWEEN c."created_at" - interval '60 seconds' AND c."created_at" + interval '60 seconds'
               AND COALESCE(e."via_user_id", e."actor_id") ~ '^[0-9a-f-]{36}$'
             ORDER BY abs(extract(epoch FROM e."created_at" - c."created_at"))
             LIMIT 1) AS agente
      FROM "finanzas"."cartolas_importadas" c
     WHERE c."creado_por_id" IS NULL
  )
  UPDATE "finanzas"."cartolas_importadas" c
     SET "creado_por_id" = a.persona::uuid, "creado_por_nombre" = u."name", "via_agente" = COALESCE(a.agente, false)
    FROM autor a
    LEFT JOIN "core"."users" u ON u."id"::text = a.persona
   WHERE a."id" = c."id" AND a.persona IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'cartolas con autor completado: %', n;

  -- Web4Leads con fecha posterior al día en que llegó (zona de la empresa): se lleva a ese día y se rehace
  -- la huella (empieza con la fecha). Se salta si la huella nueva ya existe en la cuenta.
  UPDATE "finanzas"."movimientos_bancarios" m
     SET "fecha" = (m."created_at" AT TIME ZONE t."timezone")::date,
         "clave_dedupe" = to_char((m."created_at" AT TIME ZONE t."timezone")::date, 'YYYY-MM-DD') || substr(m."clave_dedupe", 11)
    FROM "core"."tenants" t
   WHERE t."id" = m."tenant_id" AND m."origen" = 'web4leads'
     AND m."fecha" > (m."created_at" AT TIME ZONE t."timezone")::date
     AND m."clave_dedupe" ~ '^\d{4}-\d{2}-\d{2}\|'
     AND NOT EXISTS (
       SELECT 1 FROM "finanzas"."movimientos_bancarios" o
        WHERE o."tenant_id" = m."tenant_id" AND o."cuenta_id" = m."cuenta_id"
          AND o."clave_dedupe" = to_char((m."created_at" AT TIME ZONE t."timezone")::date, 'YYYY-MM-DD') || substr(m."clave_dedupe", 11));
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'movimientos de Web4Leads con fecha futura corregidos: %', n;
END $$;

COMMIT;

-- Reversión (manual): ALTER TABLE "finanzas"."cartolas_importadas" DROP COLUMN "creado_por_id",
-- DROP COLUMN "creado_por_nombre", DROP COLUMN "via_agente", DROP COLUMN "saldo_inicial";
-- UPDATE "finanzas"."cartolas_importadas" SET "saldo_final" = 0 WHERE "saldo_final" IS NULL;
-- ALTER TABLE "finanzas"."cartolas_importadas" ALTER COLUMN "saldo_final" SET NOT NULL;
-- Las fechas corregidas de Web4Leads se restauran desde el respaldo previo de Neon.
