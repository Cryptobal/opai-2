-- CAR-243 · El ACTECO (actividad económica del SII, CIIU4.CL) pasa a la configuración principal de la empresa: varios
-- códigos y uno principal en `core.perfil_empresa`, que la emisión DTE informa en <Acteco>. Hasta ahora el único dato
-- era `finanzas.dte_config.acteco` (un solo código, CAR-221).
-- Qué hace: (1) agrega `actecos` (lista, por defecto vacía) y `acteco_principal` con CHECK: cada código de 1 a 999.999,
-- hasta 20 códigos, principal presente si y solo si hay códigos, y el principal en la lista; (2) copia el ACTECO de
-- `finanzas.dte_config` como principal de su empresa, sin perderlo: si la empresa ya tiene perfil sin ACTECO se
-- completa; si no tiene perfil se crea uno solo con ese dato. `finanzas.dte_config.acteco` no se borra ni se modifica:
-- queda como columna heredada, que el código ya no lee (se retira en un PR posterior).
-- Tablas con tenant_id: no se crean tablas (perfil_empresa ya tiene RLS + FORCE + tenant_isolation).
-- Migración de datos con FORCE RLS: exige BYPASSRLS o superusuario y verifica las filas afectadas (REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."perfil_empresa" ADD COLUMN "actecos" INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE "core"."perfil_empresa" ADD COLUMN "acteco_principal" INTEGER;
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_actecos_chk"
  CHECK (
    cardinality("actecos") <= 20
    AND 1 <= ALL ("actecos") AND 999999 >= ALL ("actecos")
    AND array_position("actecos", NULL) IS NULL
    AND (("acteco_principal" IS NULL) = (cardinality("actecos") = 0))
    AND ("acteco_principal" IS NULL OR "acteco_principal" = ANY ("actecos"))
  );

DO $$
DECLARE
  v_con_perfil integer;
  v_sin_perfil integer;
  v_actualizadas integer;
  v_creadas integer;
  v_pendientes integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  SELECT count(*) INTO v_con_perfil FROM finanzas.dte_config d
    JOIN core.perfil_empresa p ON p.tenant_id = d.tenant_id
   WHERE d.acteco IS NOT NULL AND cardinality(p.actecos) = 0;
  SELECT count(*) INTO v_sin_perfil FROM finanzas.dte_config d
   WHERE d.acteco IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM core.perfil_empresa p WHERE p.tenant_id = d.tenant_id);

  UPDATE core.perfil_empresa p
     SET actecos = ARRAY[d.acteco], acteco_principal = d.acteco, updated_at = now()
    FROM finanzas.dte_config d
   WHERE d.tenant_id = p.tenant_id AND d.acteco IS NOT NULL AND cardinality(p.actecos) = 0;
  GET DIAGNOSTICS v_actualizadas = ROW_COUNT;

  INSERT INTO core.perfil_empresa (id, tenant_id, actecos, acteco_principal, created_at, updated_at)
  SELECT gen_random_uuid(), d.tenant_id, ARRAY[d.acteco], d.acteco, now(), now()
    FROM finanzas.dte_config d
   WHERE d.acteco IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM core.perfil_empresa p WHERE p.tenant_id = d.tenant_id);
  GET DIAGNOSTICS v_creadas = ROW_COUNT;

  IF v_actualizadas <> v_con_perfil OR v_creadas <> v_sin_perfil THEN
    RAISE EXCEPTION 'Se esperaba completar % perfiles y crear %, y se completaron % y se crearon % (¿RLS filtró filas?).',
      v_con_perfil, v_sin_perfil, v_actualizadas, v_creadas;
  END IF;

  -- Toda empresa con ACTECO en la configuración DTE lo tiene ahora en su perfil (como principal o, si ya tenía lista,
  -- entre sus códigos no se exige: esa lista la eligió la empresa y se respeta).
  SELECT count(*) INTO v_pendientes FROM finanzas.dte_config d
   WHERE d.acteco IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM core.perfil_empresa p WHERE p.tenant_id = d.tenant_id AND p.acteco_principal IS NOT NULL);
  IF v_pendientes <> 0 THEN
    RAISE EXCEPTION 'Quedaron % empresas con ACTECO en la configuración DTE sin ACTECO principal en su perfil.', v_pendientes;
  END IF;

  RAISE NOTICE 'ACTECO a la empresa: % perfiles completados y % creados desde finanzas.dte_config.', v_actualizadas, v_creadas;
END $$;

COMMIT;

-- Reversión (en orden inverso). Los perfiles creados por esta migración solo traen el ACTECO; se identifican porque
-- no tienen ningún otro dato. `finanzas.dte_config.acteco` nunca se tocó, así que el dato original sigue ahí:
--   BEGIN;
--   DELETE FROM core.perfil_empresa WHERE razon_social IS NULL AND rut IS NULL AND giro IS NULL AND calle IS NULL
--     AND logo_principal_id IS NULL AND nombre_comercial IS NULL AND cardinality(actecos) > 0;  -- revisar antes con SELECT
--   ALTER TABLE "core"."perfil_empresa" DROP CONSTRAINT IF EXISTS "perfil_empresa_actecos_chk";
--   ALTER TABLE "core"."perfil_empresa" DROP COLUMN IF EXISTS "acteco_principal";
--   ALTER TABLE "core"."perfil_empresa" DROP COLUMN IF EXISTS "actecos";
--   COMMIT;
-- Un ACTECO editado en el perfil después de la migración se pierde con la reversión: restaurar desde el snapshot previo.
