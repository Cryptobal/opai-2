-- OAuth del MCP (CAR-247, ADR-098): tablas del plugin `oauthProvider` de Better Auth para que una
-- persona conecte una app (Claude) a OPAI con su propia cuenta. Son de identidad, como `sessions`:
--   - sin tenant_id ni RLS; la empresa del token va en `reference_id` (uuid de core.tenants), que el
--     servidor fija tras validar la membresía activa (`sessions.oauth_tenant_id`);
--   - solo el rol `opai_auth` (clienteAuth() de packages/db) las lee y escribe; opai_app no tiene
--     ningún privilegio sobre ellas (mismo criterio que 20261029010000_identidad_rol_auth);
--   - los tokens se guardan con hash (SHA-256, base64url), nunca en claro.
-- Aditiva: tablas nuevas y una columna nullable en sessions. Tablas con tenant_id: ninguna.
-- Migración de datos: ninguna.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."sessions" ADD COLUMN     "oauth_tenant_id" UUID;

CREATE TABLE "core"."oauth_clients" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT,
    "client_discovery_id" TEXT,
    "disabled" BOOLEAN DEFAULT false,
    "skip_consent" BOOLEAN,
    "enable_end_session" BOOLEAN,
    "subject_type" TEXT,
    "scopes" TEXT[],
    "client_credentials_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "name" TEXT,
    "uri" TEXT,
    "icon" TEXT,
    "contacts" TEXT[],
    "tos" TEXT,
    "policy" TEXT,
    "software_id" TEXT,
    "software_version" TEXT,
    "software_statement" TEXT,
    "redirect_uris" TEXT[],
    "post_logout_redirect_uris" TEXT[],
    "backchannel_logout_uri" TEXT,
    "backchannel_logout_session_required" BOOLEAN,
    "token_endpoint_auth_method" TEXT,
    "application_type" TEXT,
    "jwks" TEXT,
    "jwks_uri" TEXT,
    "grant_types" TEXT[],
    "response_types" TEXT[],
    "require_pkce" BOOLEAN,
    "dpop_bound_access_tokens" BOOLEAN DEFAULT false,
    "reference_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."oauth_resources" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access_token_ttl" INTEGER,
    "refresh_token_ttl" INTEGER,
    "signing_algorithm" TEXT,
    "signing_key_id" TEXT,
    "allowed_scopes" TEXT[],
    "custom_claims" JSONB,
    "dpop_bound_access_tokens_required" BOOLEAN DEFAULT false,
    "disabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "policy_version" INTEGER DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "oauth_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."oauth_client_resources" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_client_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."oauth_refresh_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "session_id" UUID,
    "user_id" UUID NOT NULL,
    "reference_id" TEXT,
    "authorization_code_id" TEXT,
    "resources" TEXT[],
    "requested_user_info_claims" TEXT[],
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" TIMESTAMPTZ(6),
    "rotated_at" TIMESTAMPTZ(6),
    "rotation_replay_response" TEXT,
    "rotation_replay_expires_at" TIMESTAMPTZ(6),
    "auth_time" TIMESTAMPTZ(6),
    "confirmation" JSONB,
    "scopes" TEXT[],

    CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."oauth_access_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "session_id" UUID,
    "user_id" UUID,
    "reference_id" TEXT,
    "authorization_code_id" TEXT,
    "resources" TEXT[],
    "requested_user_info_claims" TEXT[],
    "refresh_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" TIMESTAMPTZ(6),
    "confirmation" JSONB,
    "scopes" TEXT[],

    CONSTRAINT "oauth_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."oauth_consents" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" UUID,
    "reference_id" TEXT,
    "resources" TEXT[],
    "requested_user_info_claims" TEXT[],
    "scopes" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."oauth_client_assertions" (
    "id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "oauth_client_assertions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_clients_client_id_key" ON "core"."oauth_clients"("client_id");

CREATE INDEX "oauth_clients_user_id_idx" ON "core"."oauth_clients"("user_id");

CREATE UNIQUE INDEX "oauth_resources_identifier_key" ON "core"."oauth_resources"("identifier");

CREATE UNIQUE INDEX "oauth_client_resources_client_id_resource_id_key" ON "core"."oauth_client_resources"("client_id", "resource_id");

CREATE UNIQUE INDEX "oauth_refresh_tokens_token_key" ON "core"."oauth_refresh_tokens"("token");

CREATE INDEX "oauth_refresh_tokens_user_id_idx" ON "core"."oauth_refresh_tokens"("user_id");

CREATE INDEX "oauth_refresh_tokens_client_id_idx" ON "core"."oauth_refresh_tokens"("client_id");

CREATE UNIQUE INDEX "oauth_access_tokens_token_key" ON "core"."oauth_access_tokens"("token");

CREATE INDEX "oauth_access_tokens_user_id_idx" ON "core"."oauth_access_tokens"("user_id");

CREATE INDEX "oauth_access_tokens_client_id_idx" ON "core"."oauth_access_tokens"("client_id");

CREATE INDEX "oauth_consents_user_id_idx" ON "core"."oauth_consents"("user_id");

ALTER TABLE "core"."oauth_clients" ADD CONSTRAINT "oauth_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_client_resources" ADD CONSTRAINT "oauth_client_resources_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_client_resources" ADD CONSTRAINT "oauth_client_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "core"."oauth_resources"("identifier") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "core"."sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "core"."sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_refresh_id_fkey" FOREIGN KEY ("refresh_id") REFERENCES "core"."oauth_refresh_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Privilegios: solo opai_auth. El GRANT por defecto del schema core le daría CRUD a opai_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "core"."oauth_clients", "core"."oauth_resources", "core"."oauth_client_resources",
  "core"."oauth_refresh_tokens", "core"."oauth_access_tokens", "core"."oauth_consents",
  "core"."oauth_client_assertions"
  TO opai_auth;
REVOKE ALL ON
  "core"."oauth_clients", "core"."oauth_resources", "core"."oauth_client_resources",
  "core"."oauth_refresh_tokens", "core"."oauth_access_tokens", "core"."oauth_consents",
  "core"."oauth_client_assertions"
  FROM opai_app;

COMMIT;
-- Reversión (manual, con el rol propietario, en una transacción), tras desplegar el código anterior:
--   DROP TABLE "core"."oauth_access_tokens", "core"."oauth_refresh_tokens", "core"."oauth_consents",
--     "core"."oauth_client_resources", "core"."oauth_resources", "core"."oauth_client_assertions",
--     "core"."oauth_clients";
--   ALTER TABLE "core"."sessions" DROP COLUMN "oauth_tenant_id";
