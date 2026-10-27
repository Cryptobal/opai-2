-- Identidad global (sin tenant_id, igual que sessions). Las sesiones anteriores deben desafiarse.
ALTER TABLE core.sessions ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false;
