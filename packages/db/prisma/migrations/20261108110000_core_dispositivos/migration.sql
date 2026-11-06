-- CAR-78 · B2 (D-01): dispositivos de terreno emparejados a una instalación. Migración ADITIVA: dos tablas
-- nuevas con RLS `tenant_isolation` (ENABLE + FORCE) y tres funciones SECURITY DEFINER para lo que ocurre
-- ANTES de que exista empresa fijada (emparejar con el código, reconocer al dispositivo por su token).
-- Los códigos y los tokens llegan ya como HMAC: la base nunca los ve en claro.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."dispositivos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "identificador" TEXT NOT NULL,
    "nombre" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "token_hash" TEXT NOT NULL,
    "emparejado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emparejado_por" UUID,
    "revocado_en" TIMESTAMPTZ(6),
    "revocado_por" UUID,
    "ultimo_contacto" TIMESTAMPTZ(6),
    "version_app" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dispositivos_estado_chk" CHECK ("estado" IN ('activo', 'revocado'))
);
CREATE UNIQUE INDEX "dispositivos_token_hash_key" ON "core"."dispositivos"("token_hash");
CREATE UNIQUE INDEX "dispositivos_tenant_id_identificador_key" ON "core"."dispositivos"("tenant_id", "identificador");
CREATE INDEX "dispositivos_tenant_id_instalacion_id_idx" ON "core"."dispositivos"("tenant_id", "instalacion_id");
ALTER TABLE "core"."dispositivos" ADD CONSTRAINT "dispositivos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."dispositivos" ADD CONSTRAINT "dispositivos_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "core"."codigos_emparejamiento" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "usado_en" TIMESTAMPTZ(6),
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "codigos_emparejamiento_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "codigos_emparejamiento_codigo_hash_key" ON "core"."codigos_emparejamiento"("codigo_hash");
CREATE INDEX "codigos_emparejamiento_tenant_id_instalacion_id_idx" ON "core"."codigos_emparejamiento"("tenant_id", "instalacion_id");
ALTER TABLE "core"."codigos_emparejamiento" ADD CONSTRAINT "codigos_emparejamiento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."codigos_emparejamiento" ADD CONSTRAINT "codigos_emparejamiento_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."dispositivos" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."codigos_emparejamiento" TO opai_app;

ALTER TABLE "core"."dispositivos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."dispositivos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."dispositivos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "core"."codigos_emparejamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."codigos_emparejamiento" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."codigos_emparejamiento" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La instalación debe ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."dispositivos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."codigos_emparejamiento"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

-- Empareja: consume el código (vigente y sin usar) y crea el dispositivo en UNA sentencia atómica. Sin
-- coincidencia devuelve cero filas, sea por código inexistente, vencido o ya usado (misma respuesta).
-- El identificador DSP-nnnn es correlativo por empresa; el bloqueo asesor por empresa evita repetidos.
CREATE OR REPLACE FUNCTION "core"."dispositivo_emparejar"(p_codigo_hash text, p_token_hash text, p_version text)
RETURNS TABLE(tenant_id uuid, dispositivo_id uuid, instalacion_id uuid, identificador text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_codigo "core"."codigos_emparejamiento"%ROWTYPE;
  v_n integer;
  v_id text;
  v_disp uuid;
BEGIN
  SELECT * INTO v_codigo FROM "core"."codigos_emparejamiento" c
   WHERE c.codigo_hash = p_codigo_hash AND c.usado_en IS NULL AND c.vence_en > now()
   FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dispositivos:' || v_codigo.tenant_id::text, 0));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(d.identificador, '\D', '', 'g'), '')::integer), 0) + 1
    INTO v_n FROM "core"."dispositivos" d WHERE d.tenant_id = v_codigo.tenant_id;
  v_id := 'DSP-' || lpad(v_n::text, 4, '0');
  v_disp := gen_random_uuid();
  INSERT INTO "core"."dispositivos" (id, tenant_id, instalacion_id, identificador, token_hash, emparejado_por, version_app, updated_at)
    VALUES (v_disp, v_codigo.tenant_id, v_codigo.instalacion_id, v_id, p_token_hash, v_codigo.creado_por, left(p_version, 40), now());
  UPDATE "core"."codigos_emparejamiento" SET usado_en = now() WHERE id = v_codigo.id;
  RETURN QUERY SELECT v_codigo.tenant_id, v_disp, v_codigo.instalacion_id, v_id;
END $$;
REVOKE ALL ON FUNCTION "core"."dispositivo_emparejar"(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."dispositivo_emparejar"(text, text, text) TO opai_app;

-- Reconoce al dispositivo por su token (HMAC) en cada petición: devuelve su empresa, instalación y estado
-- (también revocado, para mostrar «ya no está emparejado»). Registra el último contacto y la versión.
CREATE OR REPLACE FUNCTION "core"."dispositivo_por_token"(p_token_hash text, p_version text)
RETURNS TABLE(tenant_id uuid, dispositivo_id uuid, instalacion_id uuid, identificador text, estado text, revocado_en timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RETURN QUERY
  UPDATE "core"."dispositivos" d
     SET ultimo_contacto = CASE WHEN d.estado = 'activo' THEN now() ELSE d.ultimo_contacto END,
         version_app = CASE WHEN d.estado = 'activo' AND p_version IS NOT NULL THEN left(p_version, 40) ELSE d.version_app END
   WHERE d.token_hash = p_token_hash
  RETURNING d.tenant_id, d.id, d.instalacion_id, d.identificador, d.estado, d.revocado_en;
END $$;
REVOKE ALL ON FUNCTION "core"."dispositivo_por_token"(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."dispositivo_por_token"(text, text) TO opai_app;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP FUNCTION IF EXISTS "core"."dispositivo_por_token"(text, text);
--   DROP FUNCTION IF EXISTS "core"."dispositivo_emparejar"(text, text, text);
--   DROP TABLE IF EXISTS "core"."codigos_emparejamiento", "core"."dispositivos" CASCADE;
-- Solo elimina objetos nuevos de esta migración; con dispositivos ya emparejados, hay que emparejarlos de
-- nuevo: ante la duda, restaura desde el snapshot previo de Neon.
