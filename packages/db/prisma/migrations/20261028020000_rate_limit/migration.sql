-- NÚCLEO-B · Rate limit centralizado (P0 de la auditoría del núcleo, 26-oct-2026). Migración aditiva.
--
-- El rate limit dejaba de ser real en Vercel: `apps/web/lib/rate-limit.ts` era un Map en memoria por
-- instancia, así que cada instancia contaba aparte y el tope global no se cumplía. Se centraliza en la
-- base con una ventana fija por clave y un upsert atómico que cuenta y decide en una sola operación
-- (sin TOCTOU entre leer y escribir). La clave nunca guarda la API key ni la IP en claro: es el hash
-- SHA-256 de «ámbito:identificador» que calcula la aplicación antes de llamar.
--
-- `rate_limit_ventanas` no es dato de tenant (no lleva tenant_id ni RLS, como `login_intentos` o
-- `users`), pero `opai_app` NO la toca directo: se revoca todo sobre la tabla y el acceso pasa solo por
-- funciones `SECURITY DEFINER`. Así la aplicación no puede leer ni vaciar el contador de otra clave:
-- solo consumir una unidad de su propia ventana.

CREATE TABLE IF NOT EXISTS "core"."rate_limit_ventanas" (
  "clave" TEXT NOT NULL,
  "ventana_inicio" TIMESTAMPTZ(6) NOT NULL,
  "n" INTEGER NOT NULL,
  "actualizado" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "rate_limit_ventanas_pkey" PRIMARY KEY ("clave")
);

-- La purga borra por ventana vencida; el índice evita un seqscan cuando la tabla crece.
CREATE INDEX IF NOT EXISTS "rate_limit_ventanas_actualizado_idx"
  ON "core"."rate_limit_ventanas" ("actualizado");

-- opai_app no accede directo a la tabla: solo ejecuta las funciones de abajo.
REVOKE ALL ON "core"."rate_limit_ventanas" FROM opai_app;

-- Consumo atómico de una unidad de la ventana de `p_clave`. Un único upsert (INSERT ... ON CONFLICT DO
-- UPDATE) toma el lock de fila por la PK, así que N llamadas en paralelo con máximo M permiten
-- exactamente M (cada conflicto serializa e incrementa). Si la ventana venció, se reinicia (inicio
-- `now()` y n = 1). Devuelve si se permite, cuántas quedan y cuándo se reinicia la ventana.
-- SECURITY DEFINER porque opai_app no toca la tabla; search_path acotado y todo calificado por schema.
CREATE OR REPLACE FUNCTION "core"."rate_limit_consumir"(
  p_clave text, p_maximo integer, p_ventana_s integer
) RETURNS TABLE(permitido boolean, restantes integer, reinicio timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_ahora timestamptz := now();
  v_inicio timestamptz;
  v_n integer;
BEGIN
  INSERT INTO "core"."rate_limit_ventanas" AS r (clave, ventana_inicio, n, actualizado)
    VALUES (p_clave, v_ahora, 1, v_ahora)
  ON CONFLICT (clave) DO UPDATE SET
    ventana_inicio = CASE
      WHEN r.ventana_inicio + make_interval(secs => p_ventana_s) <= v_ahora
        THEN v_ahora ELSE r.ventana_inicio END,
    n = CASE
      WHEN r.ventana_inicio + make_interval(secs => p_ventana_s) <= v_ahora
        THEN 1 ELSE r.n + 1 END,
    actualizado = v_ahora
  RETURNING r.ventana_inicio, r.n INTO v_inicio, v_n;

  permitido := v_n <= p_maximo;
  restantes := GREATEST(p_maximo - v_n, 0);
  reinicio := v_inicio + make_interval(secs => p_ventana_s);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION "core"."rate_limit_consumir"(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."rate_limit_consumir"(text, integer, integer) TO opai_app;

-- Limpieza: borra las ventanas sin actividad dentro de `p_retencion_s` (ya no sirven a ningún límite
-- vigente). La llama el programador (cron diario). SECURITY DEFINER porque opai_app no borra.
CREATE OR REPLACE FUNCTION "core"."rate_limit_purgar"(p_retencion_s integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  borradas integer;
BEGIN
  DELETE FROM "core"."rate_limit_ventanas"
    WHERE actualizado < now() - make_interval(secs => p_retencion_s);
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN borradas;
END;
$$;

REVOKE ALL ON FUNCTION "core"."rate_limit_purgar"(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."rate_limit_purgar"(integer) TO opai_app;

-- Inversa (manual; Prisma no aplica down):
--   DROP FUNCTION "core"."rate_limit_purgar"(integer);
--   DROP FUNCTION "core"."rate_limit_consumir"(text, integer, integer);
--   DROP TABLE "core"."rate_limit_ventanas";
