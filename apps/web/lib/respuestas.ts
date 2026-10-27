/** Respuesta 401 uniforme para API y MCP. */
export function noAutenticado(message = "Requiere sesión o API key válida."): Response {
  return Response.json({ ok: false, error: { code: "UNAUTHENTICATED", message } }, { status: 401 });
}

/**
 * Respuesta 429 uniforme (NÚCLEO-B). El cuerpo es siempre el mismo exista o no el recurso, para no
 * revelar por el mensaje si un email, id o clave existe. `Retry-After` en segundos (por defecto 60).
 */
export function demasiadas(reintentarEnS = 60): Response {
  return Response.json(
    {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes. Inténtalo más tarde." },
    },
    { status: 429, headers: { "Retry-After": String(reintentarEnS) } },
  );
}
