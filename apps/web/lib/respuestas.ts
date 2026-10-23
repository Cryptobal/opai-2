/** Respuesta 401 uniforme para API y MCP. */
export function noAutenticado(message = "Requiere sesión o API key válida."): Response {
  return Response.json({ ok: false, error: { code: "UNAUTHENTICATED", message } }, { status: 401 });
}

export function demasiadas(): Response {
  return Response.json(
    {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes. Espera un minuto." },
    },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}
