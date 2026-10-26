-- B1 · Bloqueo de login por conteo (Brief 07c, revisión del PR #46). Migración NUEVA encima de
-- 20261026120000 (que ya puede estar aplicada en Neon dev/main), no se reescribe la anterior.
--
-- El bloqueo por fuerza bruta deja de guardarse por cuenta (login_bloqueos) y pasa a decidirse
-- contando los intentos de contraseña fallidos de login_intentos en una ventana, por correo+IP,
-- correo e IP. Así: (a) es atómico por construcción —cada fallo es un INSERT, sin carrera de
-- lectura-escritura en un contador—; (b) cubre los correos que no existen sin revelar si existen
-- —se cuenta por el hash del correo, no por el usuario—; y (c) el límite por IP vive en la base, de
-- modo que un POST directo no lo evita.

-- DropTable: ya no hay contador por cuenta.
ALTER TABLE "core"."login_bloqueos" DROP CONSTRAINT "login_bloqueos_user_id_fkey";
DROP TABLE "core"."login_bloqueos";

-- login_intentos pasa a ser solo-anexar para la aplicación (como core.bitacora): opai_app inserta y
-- lee, pero no actualiza ni borra. El propietario conserva el borrado para la purga.
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."login_intentos" FROM opai_app;

-- Purga de los intentos más viejos que `retencion_dias` (minimización de datos, Ley 21.719, y acota
-- el crecimiento de las filas de correos inexistentes). SECURITY DEFINER porque opai_app ya no puede
-- borrar: corre con el dueño de la migración. search_path acotado; todo va calificado por schema.
CREATE OR REPLACE FUNCTION "core"."purgar_login_intentos"(retencion_dias integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  borradas integer;
BEGIN
  DELETE FROM "core"."login_intentos"
    WHERE created_at < now() - make_interval(days => retencion_dias);
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN borradas;
END;
$$;

REVOKE ALL ON FUNCTION "core"."purgar_login_intentos"(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."purgar_login_intentos"(integer) TO opai_app;

-- Inversa (manual; Prisma no aplica down):
--   DROP FUNCTION "core"."purgar_login_intentos"(integer);
--   GRANT UPDATE, DELETE, TRUNCATE ON "core"."login_intentos" TO opai_app;
--   CREATE TABLE "core"."login_bloqueos" (
--       "user_id" UUID NOT NULL,
--       "fallos" INTEGER NOT NULL DEFAULT 0,
--       "bloqueado_hasta" TIMESTAMPTZ(6),
--       "ultimo_intento" TIMESTAMPTZ(6),
--       "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--       "updated_at" TIMESTAMPTZ(6) NOT NULL,
--       CONSTRAINT "login_bloqueos_pkey" PRIMARY KEY ("user_id"));
--   ALTER TABLE "core"."login_bloqueos" ADD CONSTRAINT "login_bloqueos_user_id_fkey"
--       FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
