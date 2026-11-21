-- CAR-803 · vínculo automático solo vía invitación emitida para una persona concreta.
ALTER TABLE "core"."invitations"
  ADD COLUMN IF NOT EXISTS "persona_id" UUID,
  ADD COLUMN IF NOT EXISTS "auto_acceso_users_manage" BOOLEAN;

ALTER TABLE "core"."invitations" DROP CONSTRAINT IF EXISTS "invitations_persona_id_fkey";
ALTER TABLE "core"."invitations"
  ADD CONSTRAINT "invitations_persona_id_fkey"
  FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "invitations_tenant_id_persona_id_idx"
  ON "core"."invitations"("tenant_id", "persona_id");

DROP TRIGGER IF EXISTS invitation_mismo_tenant_persona ON "core"."invitations";
CREATE TRIGGER invitation_mismo_tenant_persona
  BEFORE INSERT OR UPDATE OF "persona_id", "tenant_id" ON "core"."invitations"
  FOR EACH ROW
  EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');