import { metadatosServidorOAuth } from "@opai/auth";

/** Metadatos del servidor de autorización (RFC 8414, CAR-247): endpoints, PKCE y registro. */
export function GET(req: Request): Promise<Response> {
  return metadatosServidorOAuth(req);
}
