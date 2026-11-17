import { connection } from "next/server";

import { metadatosServidorOAuth } from "@opai/auth";

/** Metadatos del servidor de autorización (RFC 8414, CAR-247): endpoints, PKCE y registro. */
export async function GET(req: Request): Promise<Response> {
  // Pide el request real antes de leer cabeceras: sin esto, Cache Components intenta prerenderizar
  // y Better Auth usa `request.headers` en metadatosServidorOAuth (mismo patrón que cotización pública).
  await connection();
  return metadatosServidorOAuth(req);
}
