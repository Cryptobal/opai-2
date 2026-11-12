import { clienteAuth } from "@opai/db";

import { recursoMcp } from "./oauth";
import { estadoTokenOAuth, hashTokenOAuth } from "./oauth-reglas";

export type TokenOAuth = {
  userId: string;
  tenantId: string;
  clientId: string;
  app: string | null;
  alcances: string[];
};

/**
 * Token OAuth con el que una app llama al MCP (CAR-247). Vale solo si está vigente, no fue revocado,
 * su app sigue activa, es para el MCP y trae persona y empresa. Se busca por hash: el token en claro
 * nunca se guarda ni se registra.
 */
export async function tokenOAuthVigente(
  token: string,
  recurso: string = recursoMcp(),
  ahora: Date = new Date(),
): Promise<TokenOAuth | null> {
  const fila = await clienteAuth().oauthAccessToken.findUnique({
    where: { token: hashTokenOAuth(token) },
    select: {
      userId: true,
      referenceId: true,
      clientId: true,
      resources: true,
      scopes: true,
      expiresAt: true,
      revoked: true,
      client: { select: { disabled: true, name: true } },
    },
  });
  if (!fila?.userId || !fila.referenceId || !fila.resources.includes(recurso)) return null;
  const estado = estadoTokenOAuth(
    {
      expiresAt: fila.expiresAt,
      revoked: fila.revoked,
      clienteActivo: fila.client.disabled !== true,
    },
    ahora,
  );
  if (estado !== "vigente") return null;
  return {
    userId: fila.userId,
    tenantId: fila.referenceId,
    clientId: fila.clientId,
    app: fila.client.name ?? null,
    alcances: fila.scopes,
  };
}
