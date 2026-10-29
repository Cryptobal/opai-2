-- CAR-45 · CAR-46 (auditoría del núcleo I-06 e I-07): integridad de usuarios y referencias.
-- Aditiva: no borra ni corrige datos. Si hay huérfanos, el VALIDATE falla y la transacción entera
-- se revierte (nada queda a medias); el operador corre antes las consultas de huérfanos del PR.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- 1. CAR-45: borrar un usuario ya no arrastra en silencio sus membresías (ni, por la cascada de
--    memberships, sus excepciones de permisos y su alcance de supervisor) en todas las empresas.
--    La baja de un usuario en una empresa es por estado (memberships.estado = 'suspendida', vía
--    core.users.update). Las cascadas memberships → permiso_excepciones / supervisor_instalaciones
--    se conservan: solo las dispara core.users.remove, auditado y dentro de una sola empresa.
ALTER TABLE "core"."memberships" DROP CONSTRAINT IF EXISTS "memberships_user_id_fkey";
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."memberships" VALIDATE CONSTRAINT "memberships_user_id_fkey";

-- 2. CAR-46 (A): FKs para referencias que ya tenían trigger mismo_tenant pero ninguna FK, y que
--    quedaban colgando al borrar la fila referida. RESTRICT, salvo los logos de la marca (SET NULL:
--    sin el archivo, la marca vuelve al logo por defecto). El trigger mismo_tenant sigue igual.
ALTER TABLE "core"."envios" ADD CONSTRAINT "envios_evento_id_fkey"
  FOREIGN KEY ("evento_id") REFERENCES "core"."eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."notificaciones" ADD CONSTRAINT "notificaciones_evento_id_fkey"
  FOREIGN KEY ("evento_id") REFERENCES "core"."eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."documentos" ADD CONSTRAINT "documentos_reemplaza_a_id_fkey"
  FOREIGN KEY ("reemplaza_a_id") REFERENCES "core"."documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_logo_principal_id_fkey"
  FOREIGN KEY ("logo_principal_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_logo_claro_id_fkey"
  FOREIGN KEY ("logo_claro_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_logo_oscuro_id_fkey"
  FOREIGN KEY ("logo_oscuro_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_isotipo_id_fkey"
  FOREIGN KEY ("isotipo_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_favicon_id_fkey"
  FOREIGN KEY ("favicon_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."solicitudes_arco" ADD CONSTRAINT "solicitudes_arco_documento_evidencia_id_fkey"
  FOREIGN KEY ("documento_evidencia_id") REFERENCES "core"."documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."incidentes" ADD CONSTRAINT "incidentes_evidencia_doc_id_fkey"
  FOREIGN KEY ("evidencia_doc_id") REFERENCES "core"."documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "core"."retencion_ejecuciones" ADD CONSTRAINT "retencion_ejecuciones_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "core"."solicitudes_arco"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "core"."envios" VALIDATE CONSTRAINT "envios_evento_id_fkey";
ALTER TABLE "core"."notificaciones" VALIDATE CONSTRAINT "notificaciones_evento_id_fkey";
ALTER TABLE "core"."documentos" VALIDATE CONSTRAINT "documentos_reemplaza_a_id_fkey";
ALTER TABLE "core"."perfil_empresa" VALIDATE CONSTRAINT "perfil_empresa_logo_principal_id_fkey";
ALTER TABLE "core"."perfil_empresa" VALIDATE CONSTRAINT "perfil_empresa_logo_claro_id_fkey";
ALTER TABLE "core"."perfil_empresa" VALIDATE CONSTRAINT "perfil_empresa_logo_oscuro_id_fkey";
ALTER TABLE "core"."perfil_empresa" VALIDATE CONSTRAINT "perfil_empresa_isotipo_id_fkey";
ALTER TABLE "core"."perfil_empresa" VALIDATE CONSTRAINT "perfil_empresa_favicon_id_fkey";
ALTER TABLE "core"."solicitudes_arco" VALIDATE CONSTRAINT "solicitudes_arco_documento_evidencia_id_fkey";
ALTER TABLE "core"."incidentes" VALIDATE CONSTRAINT "incidentes_evidencia_doc_id_fkey";
ALTER TABLE "core"."retencion_ejecuciones" VALIDATE CONSTRAINT "retencion_ejecuciones_solicitud_id_fkey";

-- 3. CAR-46 (B): una referencia a usuario debe ser de un miembro de esa empresa (membresía en
--    cualquier estado: una suspendida sigue siendo historia válida). Argumentos: columnas; con el
--    sufijo ':plataforma' también se acepta un usuario de plataforma (platform_role), que invita al
--    primer owner de una empresa sin ser miembro. En UPDATE solo se verifica si la referencia (o el
--    tenant) cambió: una fila histórica de alguien que ya salió de la empresa se puede seguir
--    editando. SECURITY INVOKER (como verificar_mismo_tenant desde 20261028170000): lee memberships
--    con la RLS del tenant actual, y la fila nueva debe ser de ese mismo tenant.
CREATE OR REPLACE FUNCTION "core"."verificar_usuario_miembro"() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  i int;
  columna text;
  ref uuid;
BEGIN
  FOR i IN 0 .. (TG_NARGS - 1) LOOP
    columna := split_part(TG_ARGV[i], ':', 1);
    ref := (to_jsonb(NEW) ->> columna)::uuid;
    CONTINUE WHEN ref IS NULL;
    CONTINUE WHEN TG_OP = 'UPDATE'
      AND ref IS NOT DISTINCT FROM (to_jsonb(OLD) ->> columna)::uuid
      AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM core.memberships m WHERE m.tenant_id = NEW.tenant_id AND m.user_id = ref);
    CONTINUE WHEN split_part(TG_ARGV[i], ':', 2) = 'plataforma' AND EXISTS (
      SELECT 1 FROM core.users u WHERE u.id = ref AND u.platform_role IS NOT NULL);
    RAISE EXCEPTION '%.% apunta a un usuario que no es miembro de la empresa', TG_TABLE_NAME, columna
      USING ERRCODE = 'foreign_key_violation';
  END LOOP;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "core"."verificar_usuario_miembro"() FROM PUBLIC;

CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "usuario_id", "tenant_id" ON "core"."notificaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('usuario_id');
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "usuario_id", "tenant_id" ON "core"."personas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('usuario_id');
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "invited_by_user_id", "tenant_id" ON "core"."invitations"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('invited_by_user_id:plataforma');
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "responsable_id", "tenant_id" ON "core"."solicitudes_arco"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('responsable_id');
-- En ajustes, sujeto_id es un usuario solo con ámbito «usuario» (con «tenant» es el tenant).
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "sujeto_id", "ambito", "tenant_id" ON "core"."ajustes"
  FOR EACH ROW WHEN (NEW."ambito" = 'usuario')
  EXECUTE FUNCTION "core"."verificar_usuario_miembro"('sujeto_id');
CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE OF "responsable_id", "tenant_id" ON "comercial"."negocios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('responsable_id');

COMMIT;

-- Reversión: manual, solo referencia (Prisma no aplica down). Ejecutar con el rol propietario,
-- dentro de BEGIN … COMMIT con SET LOCAL lock_timeout = '5s':
--
--   DROP TRIGGER IF EXISTS usuario_miembro ON "comercial"."negocios";
--   DROP TRIGGER IF EXISTS usuario_miembro ON "core"."ajustes";
--   DROP TRIGGER IF EXISTS usuario_miembro ON "core"."solicitudes_arco";
--   DROP TRIGGER IF EXISTS usuario_miembro ON "core"."invitations";
--   DROP TRIGGER IF EXISTS usuario_miembro ON "core"."personas";
--   DROP TRIGGER IF EXISTS usuario_miembro ON "core"."notificaciones";
--   DROP FUNCTION IF EXISTS "core"."verificar_usuario_miembro"();
--   ALTER TABLE "core"."retencion_ejecuciones" DROP CONSTRAINT IF EXISTS "retencion_ejecuciones_solicitud_id_fkey";
--   ALTER TABLE "core"."incidentes" DROP CONSTRAINT IF EXISTS "incidentes_evidencia_doc_id_fkey";
--   ALTER TABLE "core"."solicitudes_arco" DROP CONSTRAINT IF EXISTS "solicitudes_arco_documento_evidencia_id_fkey";
--   ALTER TABLE "core"."perfil_empresa" DROP CONSTRAINT IF EXISTS "perfil_empresa_favicon_id_fkey";
--   ALTER TABLE "core"."perfil_empresa" DROP CONSTRAINT IF EXISTS "perfil_empresa_isotipo_id_fkey";
--   ALTER TABLE "core"."perfil_empresa" DROP CONSTRAINT IF EXISTS "perfil_empresa_logo_oscuro_id_fkey";
--   ALTER TABLE "core"."perfil_empresa" DROP CONSTRAINT IF EXISTS "perfil_empresa_logo_claro_id_fkey";
--   ALTER TABLE "core"."perfil_empresa" DROP CONSTRAINT IF EXISTS "perfil_empresa_logo_principal_id_fkey";
--   ALTER TABLE "core"."documentos" DROP CONSTRAINT IF EXISTS "documentos_reemplaza_a_id_fkey";
--   ALTER TABLE "core"."notificaciones" DROP CONSTRAINT IF EXISTS "notificaciones_evento_id_fkey";
--   ALTER TABLE "core"."envios" DROP CONSTRAINT IF EXISTS "envios_evento_id_fkey";
--   ALTER TABLE "core"."memberships" DROP CONSTRAINT IF EXISTS "memberships_user_id_fkey";
--   ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_user_id_fkey"
--     FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
