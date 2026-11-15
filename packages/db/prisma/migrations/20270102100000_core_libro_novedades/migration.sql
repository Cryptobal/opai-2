-- CAR-77 parte 1 · Libro de novedades en el núcleo (Sesión Terreno). Qué hace y por qué:
--   · core.libro_novedades: el libro de novedades de cada instalación pasa al núcleo (ADR-024 nota del 29-oct-2026:
--     el libro de 1.0 vive en Terreno, lo alimentan las rondas y lo muestra la Central sin duplicarlo). Una sola
--     tabla para todos los módulos que dejan novedades (Rondas hoy; Control de acceso y Central después), con
--     número visible correlativo por empresa (NOV-0001), dispositivo, persona declarada y hora del hecho.
--   · Copia las filas de rondas.novedades (mismo id, mismo orden por fecha) y completa dispositivo, persona y hora
--     desde core.hechos_terreno por la clave de idempotencia. Verifica que se copiaron todas.
--   · rondas.novedades NO se borra en esta migración: queda sin escrituras nuevas y se retira en un PR posterior,
--     que vuelve a copiar lo que falte antes de borrarla (decisión que espera a Carlos, por ser un borrado).
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation; referencias del mismo tenant por trigger (también
-- las de Rondas, que no llevan FK para que el núcleo no dependa del módulo, pero sí se verifican de la misma empresa).
-- Los CHECK de gravedad y estado son nuevos: si rondas.novedades tuviera un valor fuera de lista, la copia falla
-- entera (falla cerrada) y se corrige antes de reintentar.
-- Migración de datos con FORCE RLS: exige BYPASSRLS o superusuario y verifica el conteo (REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."libro_novedades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 0,
    "instalacion_id" UUID NOT NULL,
    "modulo" TEXT NOT NULL DEFAULT 'terreno',
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "ejecucion_id" UUID,
    "punto_id" UUID,
    "tipo_incidente_id" UUID,
    "gravedad" TEXT NOT NULL DEFAULT 'media',
    "resumen" TEXT NOT NULL,
    "detalle" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "dispositivo_id" UUID,
    "persona_id" UUID,
    "usuario_id" UUID,
    "hora_hecho" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "libro_novedades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "libro_novedades_gravedad_check" CHECK ("gravedad" IN ('baja', 'media', 'alta')),
    CONSTRAINT "libro_novedades_estado_check"
      CHECK ("estado" IN ('abierta', 'en_atencion', 'resuelta', 'cerrada', 'derivada'))
);
CREATE UNIQUE INDEX "libro_novedades_tenant_id_numero_key" ON "core"."libro_novedades"("tenant_id", "numero");
CREATE UNIQUE INDEX "libro_novedades_tenant_id_idempotency_key_key"
    ON "core"."libro_novedades"("tenant_id", "idempotency_key");
CREATE INDEX "libro_novedades_tenant_id_instalacion_id_hora_hecho_idx"
    ON "core"."libro_novedades"("tenant_id", "instalacion_id", "hora_hecho" DESC);
CREATE INDEX "libro_novedades_tenant_id_hora_hecho_id_idx"
    ON "core"."libro_novedades"("tenant_id", "hora_hecho" DESC, "id" DESC);

ALTER TABLE "core"."libro_novedades" ADD CONSTRAINT "libro_novedades_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."libro_novedades" ADD CONSTRAINT "libro_novedades_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."libro_novedades" ADD CONSTRAINT "libro_novedades_dispositivo_id_fkey"
    FOREIGN KEY ("dispositivo_id") REFERENCES "core"."dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."libro_novedades" ADD CONSTRAINT "libro_novedades_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "core"."libro_novedades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."libro_novedades" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."libro_novedades" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "core"."libro_novedades" TO opai_app;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."libro_novedades"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'instalacion_id', 'core.instalaciones', 'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas');
-- Referencias a Rondas: solo al insertar (sin FK, una fila de Rondas borrada después no debe impedir actualizar el
-- estado de la novedad).
CREATE TRIGGER mismo_tenant_rondas BEFORE INSERT ON "core"."libro_novedades"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'punto_id', 'rondas.puntos_control', 'tipo_incidente_id', 'rondas.tipos_incidente',
    'ejecucion_id', 'rondas.ejecuciones');

-- Número visible correlativo por empresa (NOV-0001). El candado de la transacción ordena las inserciones
-- concurrentes de la misma empresa; las filas anteriores del mismo comando ya son visibles para el trigger.
CREATE FUNCTION "core"."libro_novedades_numerar"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('core.libro_novedades:' || NEW.tenant_id::text, 0));
    SELECT COALESCE(max("numero"), 0) + 1 INTO NEW.numero
      FROM "core"."libro_novedades" WHERE "tenant_id" = NEW.tenant_id;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER numerar BEFORE INSERT ON "core"."libro_novedades"
  FOR EACH ROW EXECUTE FUNCTION "core"."libro_novedades_numerar"();

-- Copia desde rondas.novedades (mismo id), con dispositivo, persona y hora del hecho de la cola de terreno.
DO $$
DECLARE
  v_origen integer;
  v_copiadas integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  INSERT INTO "core"."libro_novedades" (
      "id", "tenant_id", "instalacion_id", "modulo", "origen", "ejecucion_id", "punto_id", "tipo_incidente_id",
      "gravedad", "resumen", "detalle", "estado", "dispositivo_id", "persona_id", "hora_hecho",
      "idempotency_key", "created_at", "updated_at")
  SELECT n."id", n."tenant_id", n."instalacion_id", 'rondas', n."origen", n."ejecucion_id", n."punto_id",
         n."tipo_incidente_id", n."gravedad", n."resumen", n."detalle", n."estado", h."dispositivo_id",
         h."persona_id", COALESCE(h."hora_corregida", n."created_at"), n."idempotency_key", n."created_at",
         n."updated_at"
    FROM "rondas"."novedades" n
    LEFT JOIN LATERAL (
      SELECT x."dispositivo_id", x."persona_id", x."hora_corregida"
        FROM "core"."hechos_terreno" x
       WHERE x."tenant_id" = n."tenant_id" AND x."tipo" = 'rondas.novedad'
         AND x."clave"::text = lower(n."idempotency_key")
       ORDER BY x."recibido_en" LIMIT 1) h ON true
   ORDER BY n."tenant_id", n."created_at", n."id"
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_copiadas = ROW_COUNT;

  SELECT count(*) INTO v_origen FROM "rondas"."novedades";
  IF EXISTS (SELECT 1 FROM "rondas"."novedades" n
              WHERE NOT EXISTS (SELECT 1 FROM "core"."libro_novedades" l WHERE l."id" = n."id")) THEN
    RAISE EXCEPTION 'CAR-77: quedaron novedades de rondas sin copiar al libro del núcleo.';
  END IF;
  RAISE NOTICE 'CAR-77: % novedades en rondas, % copiadas al libro del núcleo.', v_origen, v_copiadas;
END
$$;

COMMIT;

-- Reversión: DROP TABLE "core"."libro_novedades"; DROP FUNCTION "core"."libro_novedades_numerar"();
-- rondas.novedades sigue intacta (esta migración no la modifica), así que no se pierde nada. Si ya hubo
-- escrituras nuevas en el libro, copiarlas antes de vuelta a rondas.novedades o restaurar el snapshot previo de Neon.
