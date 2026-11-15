import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { auth } from "./auth";

/**
 * Metadatos del servidor de autorización (RFC 8414) para `/.well-known/oauth-authorization-server`:
 * el proveedor los publica bajo /api/auth y los clientes los buscan en la raíz (CAR-247).
 */
export const metadatosServidorOAuth = oauthProviderAuthServerMetadata(auth, {
  headers: { "Cache-Control": "public, max-age=300" },
});
