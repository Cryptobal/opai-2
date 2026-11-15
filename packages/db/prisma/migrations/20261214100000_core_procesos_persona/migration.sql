-- CAR-355 · Ingreso y salida de una persona como lista de pasos (parte 1).
-- ADITIVA: dos tablas nuevas y vacías; no toca tablas existentes ni migra datos.
--   · core.procesos_persona: una lista de ingreso o de salida por vínculo laboral (única por vínculo y tipo).
--   · core.procesos_persona_pasos: los pasos, con responsable (usuario), plazo, estado y la tarea del
--     núcleo (core.actividades) que los muestra en Mis tareas, Inicio y la Bandeja.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."procesos_persona" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "vinculo_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "cerrado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "procesos_persona_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "procesos_persona_tipo_check" CHECK ("tipo" IN ('ingreso', 'salida')),
    CONSTRAINT "procesos_persona_estado_check" CHECK ("estado" IN ('abierto', 'cerrado'))
);
-- Idempotencia del consumidor: una lista de cada tipo por vínculo.
CREATE UNIQUE INDEX "procesos_persona_vinculo_id_tipo_key" ON "core"."procesos_persona"("vinculo_id", "tipo");
CREATE INDEX "procesos_persona_tenant_id_persona_id_idx" ON "core"."procesos_persona"("tenant_id", "persona_id");

CREATE TABLE "core"."procesos_persona_pasos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "proceso_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "responsable_id" UUID,
    "vence" DATE NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'por_hacer',
    "actividad_id" UUID,
    "hecho_en" TIMESTAMPTZ(6),
    "hecho_por_id" UUID,
    "nota" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "procesos_persona_pasos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "procesos_persona_pasos_estado_check" CHECK ("estado" IN ('por_hacer', 'hecho', 'omitido')),
    CONSTRAINT "procesos_persona_pasos_largos_check"
      CHECK (char_length("titulo") BETWEEN 1 AND 120 AND ("nota" IS NULL OR char_length("nota") <= 500))
);
CREATE INDEX "procesos_persona_pasos_tenant_id_proceso_id_idx" ON "core"."procesos_persona_pasos"("tenant_id", "proceso_id");
CREATE INDEX "procesos_persona_pasos_actividad_id_idx" ON "core"."procesos_persona_pasos"("actividad_id");

ALTER TABLE "core"."procesos_persona" ADD CONSTRAINT "procesos_persona_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."procesos_persona" ADD CONSTRAINT "procesos_persona_persona_id_fkey"
  FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- La reversión de un lote importado borra el vínculo: su lista (si la hubiera) se va con él.
ALTER TABLE "core"."procesos_persona" ADD CONSTRAINT "procesos_persona_vinculo_id_fkey"
  FOREIGN KEY ("vinculo_id") REFERENCES "core"."vinculos_laborales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."procesos_persona_pasos" ADD CONSTRAINT "procesos_persona_pasos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."procesos_persona_pasos" ADD CONSTRAINT "procesos_persona_pasos_proceso_id_fkey"
  FOREIGN KEY ("proceso_id") REFERENCES "core"."procesos_persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Si se borra la tarea, el paso sigue y se puede reabrir (crea otra).
ALTER TABLE "core"."procesos_persona_pasos" ADD CONSTRAINT "procesos_persona_pasos_actividad_id_fkey"
  FOREIGN KEY ("actividad_id") REFERENCES "core"."actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "core"."procesos_persona" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."procesos_persona" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."procesos_persona" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "core"."procesos_persona_pasos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."procesos_persona_pasos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."procesos_persona_pasos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Sin DELETE: las listas no se borran desde la app (solo en cascada con su vínculo o persona).
GRANT SELECT, INSERT, UPDATE ON "core"."procesos_persona", "core"."procesos_persona_pasos" TO opai_app;

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."procesos_persona"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'vinculo_id', 'core.vinculos_laborales');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."procesos_persona_pasos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'proceso_id', 'core.procesos_persona', 'actividad_id', 'core.actividades');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "core"."procesos_persona_pasos", "core"."procesos_persona";
-- Solo elimina objetos nuevos de esta migración; nada existente depende de ellos.
