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
