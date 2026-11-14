-- CAR-84 (Brief 13, PR 2) · Un ticket puede referirse a una instalación. Columna opcional, FK a core.instalaciones y
-- trigger de mismo tenant ampliado. Aditiva, sin datos (los tickets existentes quedan sin instalación).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "tickets"."tickets" ADD COLUMN "instalacion_id" UUID;
ALTER TABLE "tickets"."tickets" ADD CONSTRAINT "tickets_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "tickets_tenant_id_instalacion_id_idx" ON "tickets"."tickets"("tenant_id", "instalacion_id");

-- El tipo y la instalación deben ser de la misma empresa (trigger del núcleo; los nulos se ignoran).
DROP TRIGGER mismo_tenant ON "tickets"."tickets";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "tickets"."tickets"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'tipo_id', 'tickets.tipos_ticket', 'instalacion_id', 'core.instalaciones');

COMMIT;

-- Reversión: DROP TRIGGER mismo_tenant ON "tickets"."tickets"; CREATE TRIGGER mismo_tenant ... ('tipo_id',
-- 'tickets.tipos_ticket'); ALTER TABLE "tickets"."tickets" DROP COLUMN "instalacion_id";
