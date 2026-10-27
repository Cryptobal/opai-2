-- Aditiva e idempotente: incluye todos los esquemas de módulos existentes.
DO $$
DECLARE tabla record;
BEGIN
  FOR tabla IN
    SELECT DISTINCT schemaname, tablename FROM pg_policies
    WHERE policyname = 'tenant_isolation'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', tabla.schemaname, tabla.tablename);
  END LOOP;
END $$;

-- Estos triggers consultan únicamente referencias del tenant actual. No deben depender
-- del bypass implícito del dueño (ni requerir BYPASSRLS en funciones de la aplicación).
ALTER FUNCTION core.verificar_mismo_tenant() SECURITY INVOKER;
ALTER FUNCTION core.puesto_ciclo_del_patron() SECURITY INVOKER;
ALTER FUNCTION core.patron_en_uso_inmutable() SECURITY INVOKER;

-- Reversión (manual, solo referencia; no la aplica Prisma). Ejecutar con el rol propietario.
-- Conserva FORCE en las dos tablas que ya lo tenían antes de esta migración.
-- Lista generada desde pg_policies (tenant_isolation), igual que en la aplicación.
--
--   ALTER TABLE "core"."ajustes" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."api_keys" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."api_keys_autonomia" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."aprobaciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."audit_events" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."bitacora" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."bitacora_cabezas" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."cargos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."claves_tenant" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."comprobantes" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."consentimientos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."consumos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."consumos_diarios" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."contactos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."cuentas" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."cuentas_representantes" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."documento_tipos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."documento_vinculos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."documentos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."dpa_aceptaciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."envios" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."estructuras_items" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."estructuras_sueldo" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."eventos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."eventos_entregas" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."funciones_puesto" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."idempotencias" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."ids_externos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."incidentes" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."instalaciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."integraciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."invitations" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."memberships" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."notificacion_reglas" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."notificaciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."patrones_turno" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."perfil_empresa" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."permiso_excepciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."personas" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."plantillas" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."puestos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."retencion_ejecuciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."roles" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."secretos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."solicitudes_arco" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."supervisor_instalaciones" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."tenant_modules" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."trabajos" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."usage_events" NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "core"."vinculos_laborales" NO FORCE ROW LEVEL SECURITY;
--   ALTER FUNCTION core.verificar_mismo_tenant() SECURITY DEFINER SET search_path = pg_catalog, pg_temp;
--   ALTER FUNCTION core.puesto_ciclo_del_patron() SECURITY DEFINER SET search_path = pg_catalog, pg_temp;
--   ALTER FUNCTION core.patron_en_uso_inmutable() SECURITY DEFINER SET search_path = pg_catalog, pg_temp;
