-- Brief 02 · endurecimiento del núcleo tras la revisión independiente de la sesión A.

-- 1. Montos en micro-USD acumulables: BIGINT (INT se desborda sobre ~2.147 USD).
ALTER TABLE "core"."consumos_diarios" ALTER COLUMN "costo_total_micro" SET DATA TYPE BIGINT;
ALTER TABLE "core"."api_keys" ALTER COLUMN "presupuesto_mensual_micro" SET DATA TYPE BIGINT;

-- 2. Último acceso por actor (selector de empresa) sin recorrer los consumos del tenant.
CREATE INDEX "consumos_tenant_id_actor_tipo_actor_id_created_at_idx"
  ON "core"."consumos"("tenant_id", "actor_tipo", "actor_id", "created_at");

-- 3. Referencias dentro del mismo tenant. Las FK de Postgres no pasan por RLS: sin esta
-- verificación, una fila del tenant A podría apuntar (adivinando el uuid) a una del tenant B.
-- Se usa un trigger y no FK compuestas porque Prisma no admite relaciones opcionales con un
-- campo requerido (tenant_id) en la clave, y los triggers no generan drift en `migrate dev`.
-- Argumentos: pares (columna, tabla referida).
CREATE OR REPLACE FUNCTION "core"."verificar_mismo_tenant"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  i int;
  ref uuid;
  dueno uuid;
BEGIN
  FOR i IN 0 .. (TG_NARGS / 2 - 1) LOOP
    ref := (to_jsonb(NEW) ->> TG_ARGV[i * 2])::uuid;
    CONTINUE WHEN ref IS NULL;
    EXECUTE format('SELECT tenant_id FROM %s WHERE id = $1', TG_ARGV[i * 2 + 1])
      INTO dueno USING ref;
    IF dueno IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION '%.% apunta a una fila de otra empresa o inexistente', TG_TABLE_NAME, TG_ARGV[i * 2]
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "core"."verificar_mismo_tenant"() FROM PUBLIC;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."secretos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('integracion_id', 'core.integraciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."aprobaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('api_key_id', 'core.api_keys');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."api_keys_autonomia"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('api_key_id', 'core.api_keys');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."documentos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'tipo_id', 'core.documento_tipos', 'reemplaza_a_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."documento_vinculos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."cuentas_representantes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."contactos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."puestos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'instalacion_id', 'core.instalaciones', 'cargo_id', 'core.cargos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."vinculos_laborales"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'cargo_id', 'core.cargos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."estructuras_sueldo"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'cargo_id', 'core.cargos', 'puesto_id', 'core.puestos', 'persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."estructuras_items"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('estructura_id', 'core.estructuras_sueldo');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."perfil_empresa"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'logo_principal_id', 'core.documentos', 'logo_claro_id', 'core.documentos',
    'logo_oscuro_id', 'core.documentos', 'isotipo_id', 'core.documentos',
    'favicon_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."eventos_entregas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('evento_id', 'core.eventos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."notificaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('evento_id', 'core.eventos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."envios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('evento_id', 'core.eventos');

-- 4. Tablas de plataforma (sin tenant): la aplicación lee y edita, nunca borra.
REVOKE DELETE, TRUNCATE ON "core"."ajustes_plataforma", "core"."precios_recursos" FROM opai_app;

-- 5. Zona UTC también por rol, por si la base no pudo fijarse (sin ser dueño de la base).
DO $$
BEGIN
  ALTER ROLE opai_app SET timezone TO 'UTC';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sin permiso para ALTER ROLE opai_app; revisar la zona horaria de la base.';
END
$$;
