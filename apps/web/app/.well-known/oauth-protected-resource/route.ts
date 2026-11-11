import { metadatosRecursoMcp } from "@opai/auth";

/** Metadatos del recurso protegido /api/mcp (RFC 9728, CAR-247). Públicos: no revelan nada propio. */
export function GET(): Response {
  return Response.json(metadatosRecursoMcp(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
